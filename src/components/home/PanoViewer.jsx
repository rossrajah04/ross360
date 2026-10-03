import { useEffect, useRef, useState } from 'react';

// Interactive 360° preview of an equirectangular photograph, drawn with WebGL as an ordinary camera view.
// Drag (or use the arrow keys) to look around. It turns slowly on its own until someone interacts, unless
// they prefer reduced motion, and it only draws while on screen. The texture loads as it nears the
// viewport, at the largest size the device supports. Without WebGL it shows the flat image instead.
//
// This is a preview of the space. The full tour itself is the Panoee embed (src/content/site.js).

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D tex;
uniform float yaw, pitch, tanHalf, aspect;
const float PI = 3.14159265;
void main() {
  vec3 d = vec3(v.x * tanHalf * aspect, v.y * tanHalf, -1.0);
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  d = normalize(d);
  float lon = atan(d.x, -d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  gl_FragColor = texture2D(tex, vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 - lat / PI));
}`;

const HFOV = (width) => (width < 700 ? 82 : 92); // horizontal field of view in degrees
const AUTO_SPEED = 0.035; // radians per second
const MAX_PITCH = 0.75;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export default function PanoViewer({ image, label, className = '', initialYaw = 0 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | ready | fallback
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !image) return undefined;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) {
      setState('fallback');
      return undefined;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setState('fallback');
      return undefined;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(['yaw', 'pitch', 'tanHalf', 'aspect'].map((n) => [n, gl.getUniformLocation(program, n)]));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const view = { yaw: initialYaw, pitch: 0, vyaw: 0, vpitch: 0, auto: !reduceMotion };
    let loaded = false;
    let requested = false;
    let visible = false;
    let frame = 0;
    let last = 0;
    let dragging = null;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(wrap.clientWidth * ratio);
      const h = Math.round(wrap.clientHeight * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = () => {
      resize();
      const aspect = canvas.width / canvas.height;
      const tanHalfH = Math.tan(((HFOV(wrap.clientWidth) * Math.PI) / 180) / 2);
      gl.uniform1f(u.yaw, view.yaw);
      gl.uniform1f(u.pitch, view.pitch);
      gl.uniform1f(u.tanHalf, tanHalfH / aspect);
      gl.uniform1f(u.aspect, aspect);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const tick = (time) => {
      frame = 0;
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      if (!dragging) {
        view.yaw += view.vyaw * dt;
        view.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, view.pitch + view.vpitch * dt));
        const decay = Math.pow(0.04, dt);
        view.vyaw *= decay;
        view.vpitch *= decay;
        if (view.auto) view.yaw += AUTO_SPEED * dt;
      }
      draw();
      const moving = dragging || view.auto || Math.abs(view.vyaw) > 0.001 || Math.abs(view.vpitch) > 0.001;
      if (visible && moving) frame = requestAnimationFrame(tick);
      else last = 0;
    };

    const start = () => {
      if (loaded && visible && !frame) frame = requestAnimationFrame(tick);
    };

    const load = () => {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const want = wrap.clientWidth * Math.min(window.devicePixelRatio || 1, 2) * (360 / HFOV(wrap.clientWidth));
      const fits = image.data.widths.filter((w) => w <= max);
      const width = fits.find((w) => w >= want) || fits[fits.length - 1] || image.data.widths[0];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        loaded = true;
        setState('ready');
        draw();
        start();
      };
      img.onerror = () => setState('fallback');
      img.src = `/images/home/${image.file}-${width}.jpg`;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !requested) {
          requested = true;
          load();
        }
        if (visible) start();
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(wrap);

    const interact = () => {
      if (view.auto) view.auto = false;
      setTouched(true);
    };

    const onDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = { x: event.clientX, y: event.clientY, t: performance.now(), id: event.pointerId };
      view.vyaw = 0;
      view.vpitch = 0;
      wrap.setPointerCapture(event.pointerId);
      interact();
      start();
    };
    const onMove = (event) => {
      if (!dragging || event.pointerId !== dragging.id) return;
      const radiansPerPixel = ((HFOV(wrap.clientWidth) * Math.PI) / 180) / wrap.clientWidth;
      const dx = event.clientX - dragging.x;
      const dy = event.pointerType === 'touch' ? 0 : event.clientY - dragging.y;
      const now = performance.now();
      const dt = Math.max((now - dragging.t) / 1000, 0.001);
      view.yaw -= dx * radiansPerPixel;
      view.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, view.pitch + dy * radiansPerPixel));
      view.vyaw = (-dx * radiansPerPixel) / dt;
      view.vpitch = (dy * radiansPerPixel) / dt;
      dragging = { ...dragging, x: event.clientX, y: event.clientY, t: now };
    };
    const onUp = (event) => {
      if (!dragging || event.pointerId !== dragging.id) return;
      if (performance.now() - dragging.t > 80) {
        view.vyaw = 0;
        view.vpitch = 0;
      }
      dragging = null;
      start();
    };
    const onKey = (event) => {
      const step = 0.12;
      const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (!keys[event.key]) return;
      event.preventDefault();
      interact();
      view.yaw += keys[event.key][0];
      view.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, view.pitch + keys[event.key][1]));
      start();
    };
    const onResize = () => {
      if (loaded) draw();
    };

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
    wrap.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    };
  }, [image, initialYaw]);

  if (!image) return <div className={`pano pano--empty ${className}`.trim()} aria-hidden="true" />;

  if (state === 'fallback') {
    const width = image.data.widths[0];
    return (
      <div className={`pano ${className}`.trim()}>
        <img className="pano__flat" src={`/images/home/${image.file}-${width}.jpg`} alt={image.alt} />
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`pano${state === 'ready' ? ' is-ready' : ''}${touched ? ' is-touched' : ''} ${className}`.trim()}
      style={{ backgroundColor: image.data.color }}
      role="img"
      aria-label={`${image.alt}. ${label}`}
      tabIndex={0}
    >
      <canvas ref={canvasRef} className="pano__canvas" />
      <span className="pano__hint" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
