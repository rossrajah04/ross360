import { useEffect, useRef, useState } from 'react';

// A lightweight 360° photo viewer: one equirectangular image drawn with WebGL, dragged to look around.
// No tour interface and no automatic movement. Until the image is ready (or if WebGL is unavailable) the
// still `poster` shows instead. Vertical swipes still scroll the page on phones (touch-action: pan-y);
// sideways drags turn the view.
//
// yaw/pitch/fov are in degrees, matching the flat-view script used to pick the still: yaw turns
// left/right, positive pitch looks down.
const VERTEX = `
attribute vec2 p;
varying vec2 v;
void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
varying vec2 v;
uniform sampler2D img;
uniform float yaw, pitch, focal, aspect;
const float PI = 3.141592653589793;
void main() {
  vec3 d = normalize(vec3(v.x * aspect, -v.y, focal));
  float cp = cos(pitch), sp = sin(pitch);
  vec3 r = vec3(d.x, cp * d.y + sp * d.z, -sp * d.y + cp * d.z);
  float cy = cos(yaw), sy = sin(yaw);
  vec3 q = vec3(cy * r.x + sy * r.z, r.y, -sy * r.x + cy * r.z);
  float lon = atan(q.x, q.z);
  float lat = asin(clamp(-q.y, -1.0, 1.0));
  gl_FragColor = texture2D(img, vec2(fract((lon / PI + 1.0) / 2.0), 0.5 - lat / PI));
}`;

const toRad = (deg) => (deg * Math.PI) / 180;

export default function PanoView({ src, poster, alt, yaw = 0, pitch = 0, fov = 100, className = '' }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return undefined;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(program, name);
    const uYaw = u('yaw');
    const uPitch = u('pitch');
    const uFocal = u('focal');
    const uAspect = u('aspect');

    const view = { yaw: toRad(yaw), pitch: toRad(pitch), vx: 0 };
    const maxPitch = toRad(55);
    let loaded = false;
    let frame = 0;
    let disposed = false;

    const draw = () => {
      frame = 0;
      if (!loaded || disposed) return;
      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);
      // fov is the horizontal field of view on landscape screens and the vertical one on portrait screens.
      const aspect = w / h;
      const half = Math.tan(toRad(fov) / 2);
      const focal = aspect >= 1 ? aspect / half : 1 / half;
      gl.uniform1f(uYaw, view.yaw);
      gl.uniform1f(uPitch, view.pitch);
      gl.uniform1f(uFocal, focal);
      gl.uniform1f(uAspect, aspect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      request();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      loaded = true;
      draw();
      setReady(true);
    };
    image.src = src;

    // Dragging: pixels to radians scale with the field of view so the room moves with the finger.
    let drag = null;
    let glide = 0;
    const perPixel = () => toRad(fov) / canvas.getBoundingClientRect().width;
    const onDown = (e) => {
      cancelAnimationFrame(glide);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      view.vx = 0;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const k = perPixel();
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const dt = Math.max(1, e.timeStamp - drag.t);
      view.yaw -= dx * k;
      view.vx = (-dx * k) / dt;
      if (e.pointerType === 'mouse') {
        view.pitch = Math.max(-maxPitch, Math.min(maxPitch, view.pitch - dy * k));
      }
      drag = { ...drag, x: e.clientX, y: e.clientY, t: e.timeStamp };
      request();
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      // A short, gentle glide after letting go.
      let last = performance.now();
      const step = (now) => {
        const dt = now - last;
        last = now;
        view.vx *= Math.pow(0.9, dt / 16);
        if (Math.abs(view.vx) < 0.00002) return;
        view.yaw += view.vx * dt;
        draw();
        glide = requestAnimationFrame(step);
      };
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) glide = requestAnimationFrame(step);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(glide);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [src, yaw, pitch, fov]);

  return (
    <div className={`pano-view${ready ? ' pano-view--ready' : ''} ${className}`.trim()}>
      {poster}
      <canvas ref={canvasRef} className="pano-view__canvas" role="img" aria-label={alt} />
    </div>
  );
}
