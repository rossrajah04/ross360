import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import Button from '../components/Button.jsx';

// Shown for any unknown URL. On Cloudflare Pages the prerendered 404.html loads this route.
export default function NotFound() {
  return (
    <>
      <Seo page="notFound" />
      <PageHero
        title="Page not found"
        lead="The page you requested does not exist or has moved."
      >
        <div className="btn-row">
          <Button to="/">Home page</Button>
          <Button to="/get-a-quote" variant="secondary">
            Get a Quote
          </Button>
        </div>
      </PageHero>
    </>
  );
}
