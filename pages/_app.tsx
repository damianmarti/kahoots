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
      <nav style={{
        width: '100%',
        boxSizing: 'border-box',
        background: '#fff',
        padding: '14px 24px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1.5px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/" legacyBehavior>
          <a style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
            <img src="/logo-fiuba.png" alt="FIUBA Logo" style={{ maxHeight: 40, width: 'auto', verticalAlign: 'middle' }} />
          </a>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <NavLink href="/results">Kahoots</NavLink>
          <NavLink href="/kahoot-summary">Resumen</NavLink>
          <NavLink href="/student-summary">Estudiantes</NavLink>

          {admin && (
            <>
              <span style={{ width: 1, height: 22, background: '#e0e0e0', margin: '0 12px' }} />
              <NavLink href="/upload">Upload</NavLink>
              <NavLink href="/admin">Cuestionarios</NavLink>
              <NavLink href="/admin/games">Juegos</NavLink>
              <NavLink href="/admin/students">Alumnos</NavLink>
              <NavLink href="/admin/users">Admins</NavLink>
            </>
          )}
        </div>

        {admin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#666', fontSize: 15 }}>{admin.username}</span>
            <button
              onClick={logout}
              style={{
                background: '#888',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 14px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Salir
            </button>
          </div>
        ) : (
          <NavLink href="/admin/login">Admin</NavLink>
        )}
      </nav>
      <Component {...pageProps} />
    </>
  );
}

const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <Link href={href} legacyBehavior>
    <a
      style={{
        color: '#222',
        margin: '0 14px',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: 17,
        transition: 'color 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.color = '#1976d2';
        (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.color = '#222';
        (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
      }}
    >
      {children}
    </a>
  </Link>
);

export default MyApp;
