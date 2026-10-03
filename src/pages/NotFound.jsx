import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import Button from '../components/Button.jsx';

// Shown for any unknown URL. On Cloudflare Pages the prerendered 404.html loads this route.
export default function NotFound() {
  return (
    <>
      <Seo page="notFound" />
      <PageHero
        eyebrow="404"
        title="We couldn’t find that page"
        lead="The page may have moved, or the link may be incorrect."
      >
        <div className="btn-row">
          <Button to="/">Back to home</Button>
          <Button to="/get-a-quote" variant="secondary">
            Get a Quote
          </Button>
        </div>
      </PageHero>
    </>
  );
}
