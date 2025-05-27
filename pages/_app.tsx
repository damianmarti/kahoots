import type { AppProps } from 'next/app';
import Link from 'next/link';
import React from 'react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <nav style={{
        width: '100%',
        background: '#fff',
        padding: '18px 0',
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1.5px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/" legacyBehavior>
          <a style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
            <img src="https://www.fi.uba.ar/images/logo-fiuba.png" alt="FIUBA Logo" style={{ maxHeight: 40, width: 'auto', marginRight: 12, verticalAlign: 'middle' }} />
          </a>
        </Link>
        <NavLink href="/upload">Upload</NavLink>
        <NavLink href="/results">Kahoots</NavLink>
        <NavLink href="/kahoot-summary">Resumen</NavLink>
        <NavLink href="/student-summary">Estudiantes</NavLink>
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
        margin: '0 20px',
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