import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex items-start justify-center pt-16">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <CardTitle className="text-xl">Bem-vindo ao DuEstuda</CardTitle>
            <CardDescription>
              Sua plataforma inteligente de estudos para concursos.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O layout base está funcionando corretamente. A sidebar de navegação,
            a topbar e o conteúdo principal estão configurados e prontos para
            receber os próximos módulos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
