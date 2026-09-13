import type { ReactNode } from "react";
export default function PageHeader({title, description, eyebrow, actions}: {title:string; description:string; eyebrow?:string; actions?:ReactNode}) {
  return <div className="page-heading"><div>{eyebrow && <p className="page-context">{eyebrow}</p>}<h1>{title}</h1><p className="page-description">{description}</p></div>{actions && <div className="page-heading-actions">{actions}</div>}</div>;
}
