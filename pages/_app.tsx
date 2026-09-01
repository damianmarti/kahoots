import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import '../styles/globals.css';

const SITE_TITLE = 'Kahoots FIUBA';
const SITE_DESCRIPTION = 'Cuestionarios y juegos en vivo estilo Kahoot para FIUBA.';
// URL absoluta del sitio para los meta OG (los scrapers no ejecutan JS ni
// resuelven rutas relativas). Override con NEXT_PUBLIC_SITE_URL si cambia el dominio.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kahoots.vercel.app').replace(/\/$/, '');
const SITE_IMAGE = `${SITE_URL}/og-image.png`;

const SiteHead: React.FC = () => (
  <Head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{SITE_TITLE}</title>
    <meta name="description" content={SITE_DESCRIPTION} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    {/* Open Graph */}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={SITE_TITLE} />
    <meta property="og:title" content={SITE_TITLE} />
    <meta property="og:description" content={SITE_DESCRIPTION} />
    <meta property="og:image" content={SITE_IMAGE} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    {/* Twitter */}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={SITE_TITLE} />
    <meta name="twitter:description" content={SITE_DESCRIPTION} />
    <meta name="twitter:image" content={SITE_IMAGE} />
  </Head>
);

interface AdminInfo {
  id: number;
  username: string;
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  // Menú plegable: solo se ve en móviles (ver .site-nav__toggle en globals.css)
  const [menuOpen, setMenuOpen] = useState(false);

  // Al navegar se cierra, para no tapar la página recién abierta
  useEffect(() => {
    setMenuOpen(false);
  }, [router.asPath]);

  // Se consulta la sesión al montar y en cada navegación, para que el menú se
  // actualice tras iniciar o cerrar sesión.
  useEffect(() => {
    // En /play y /host no se muestra el nav; evitamos requests extra durante el juego en vivo.
    if (router.pathname.startsWith('/play') || router.pathname.startsWith('/host')) return;

    let cancelled = false;
    fetch('/api/admin/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled) setAdmin(data?.admin ?? null);
      })
      .catch(() => {
        if (!cancelled) setAdmin(null);
      });
    return () => {
      cancelled = true;
    };
  }, [router.asPath, router.pathname]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdmin(null);
    router.push('/admin/login');
  };

  // Las pantallas del juego en vivo son fullscreen, sin barra de navegación
  if (router.pathname.startsWith('/play') || router.pathname.startsWith('/host')) {
    return (
      <>
        <SiteHead />
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      <SiteHead />
      <nav className={`site-nav${menuOpen ? ' is-open' : ''}`}>
        <Link href="/" legacyBehavior>
          <a className="site-nav__logo">
            <img src="/logo-fiuba.png" alt="FIUBA Logo" />
          </a>
        </Link>

        <button
          type="button"
          className="site-nav__toggle"
          onClick={() => setMenuOpen(open => !open)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="site-nav-links"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <div className="site-nav__links" id="site-nav-links">
          <NavLink href="/results">Kahoots</NavLink>
          <NavLink href="/kahoot-summary">Resumen</NavLink>
          <NavLink href="/student-summary">Estudiantes</NavLink>

          {admin && (
            <>
              <span className="nav-sep" />
              <NavLink href="/upload">Upload</NavLink>
              <NavLink href="/admin">Cuestionarios</NavLink>
              <NavLink href="/admin/games">Juegos</NavLink>
              <NavLink href="/admin/students">Alumnos</NavLink>
              <NavLink href="/admin/users">Admins</NavLink>
            </>
          )}
        </div>

        <div className="site-nav__session">
          {admin ? (
            <>
              <span className="site-nav__user">{admin.username}</span>
              <button onClick={logout} className="site-nav__logout">Salir</button>
            </>
          ) : (
            <NavLink href="/admin/login">Admin</NavLink>
          )}
        </div>
      </nav>
      <Component {...pageProps} />
    </>
  );
}

const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <Link href={href} legacyBehavior>
    <a className="nav-link">{children}</a>
  </Link>
);

export default MyApp;
