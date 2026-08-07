export function generateStaticParams() {
  return [{ id: "default" }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
