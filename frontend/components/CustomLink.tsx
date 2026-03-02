import React from 'react';
import { useHref, useLinkClickHandler, useLocation, useResolvedPath, matchPath } from 'react-router';

// A replacement for react-router-dom's Link
const Link = React.forwardRef<
  HTMLAnchorElement,
  { to: any; replace?: boolean; state?: any; children?: React.ReactNode; [key: string]: any; }
>(function LinkWithRef({ to, replace = false, state, children, ...rest }, ref) {
  let href = useHref(to);
  let handleClick = useLinkClickHandler(to, { replace, state });
  
  return (
    <a {...rest} href={href} onClick={handleClick} ref={ref}>
      {children}
    </a>
  );
});

// A replacement for react-router-dom's NavLink
export const NavLink = React.forwardRef<
  HTMLAnchorElement,
  { to: any; replace?: boolean; state?: any; children?: React.ReactNode; className?: string | ((props: { isActive: boolean }) => string); style?: React.CSSProperties | ((props: { isActive: boolean; }) => React.CSSProperties); [key: string]: any; }
>(function NavLinkWithRef({ to, children, className: classNameProp, style: styleProp, ...rest }, ref) {
  
  let location = useLocation();
  let path = useResolvedPath(to);
  // NavLink from react-router-dom has special logic for the `end` prop. 
  // For this app's usage, an exact match is always desired.
  let match = matchPath({ path: path.pathname, end: true }, location.pathname);
  const isActive = !!match;

  let className;
  if (typeof classNameProp === 'function') {
    className = classNameProp({ isActive });
  } else {
    // Combine the passed className with "active" if the link is active
    className = [classNameProp, isActive ? 'active' : null].filter(Boolean).join(' ');
  }

  let style =
    typeof styleProp === "function" ? styleProp({ isActive }) : styleProp;

  return <Link {...rest} to={to} ref={ref} className={className} style={style}>{children}</Link>;
});