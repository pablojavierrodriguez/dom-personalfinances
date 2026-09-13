import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DominusLogo } from "@/components/ui/DominusLogo";
import { 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Github, 
  Zap, 
  Layers,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"features" | "benchmark">("benchmark");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Header / Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <DominusLogo
            size="sm"
            showTagline
            taglineText="Finanzas Soberanas"
          />

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:bg-secondary/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Fork en GitHub</span>
            </a>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
            >
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border/60 text-xs text-muted-foreground font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>El dominio no se conquista. Se administra. · 100% Soberano</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Tus finanzas, tu base de datos, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              tu propio WhatsApp.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            La app de finanzas personales open-source que registra gastos en 3 segundos con audios o fotos de tickets, 
            proyecta tu flujo de fondos y corre en tu propia nube o en local.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md active:scale-95"
            >
              <span>Comenzar Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#benchmark"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground font-medium text-sm border border-border/50 transition-all"
            >
              <span>Ver Comparativa vs. Líderes</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </div>
      </section>

      {/* 3 Pilares Asimétricos */}
      <section className="py-12 px-4 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-surface">
            <div className="card-inner h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Ingesta por WhatsApp (IA)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enviá un audio: <i>"Gasté $14.500 en Coto con Galicia"</i> o la foto de un ticket. El agente extrae el monto, comercio y categoría sin tocar una pantalla.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-medium text-primary">
                Fricción Cero en el día a día →
              </div>
            </div>
          </div>

          <div className="card-surface">
            <div className="card-inner h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Cash Flow Forecast (30/60/90D)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Anticipá día a día si vas a llegar a fin de mes. Incluye simulador de compras para responder: <i>"¿Puedo gastar $X hoy sin quedar en rojo?"</i>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-medium text-primary">
                Tranquilidad y certeza preventiva →
              </div>
            </div>
          </div>

          <div className="card-surface">
            <div className="card-inner h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Soberanía Total de Datos</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  PostgreSQL con Row Level Security en tu propia cuenta de Supabase o en Docker local. Nadie vende tus hábitos ni te cobra suscripciones para ver gráficos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-medium text-primary">
                Clone, Fork & Deploy en 1 clic →
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark Interactivo */}
      <section id="benchmark" className="py-16 px-4 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Benchmark de Mercado</span>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-foreground mt-1 mb-3">
            ¿Por qué DOM supera a las soluciones comerciales?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Comparativa directa frente a las dos soluciones móviles más populares a nivel global y regional.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-lg">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-secondary/50">
                <th className="py-4 px-4 sm:px-6 font-semibold text-foreground">Capacidad Clave</th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-primary bg-primary/10">DOM</th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-muted-foreground">Mobills Premium</th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-muted-foreground">Wallet by BudgetBakers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-foreground">Ingesta Autónoma (WhatsApp + IA)</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-primary bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Voz, foto de ticket y lenguaje natural</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span>Solo manual o SMS (Android)</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span>Solo manual o sync bancario</span>
                  </div>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-foreground">Proyección de Flujo de Caja</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-primary bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>30/60/90D + Simulador de Compras</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Línea rígida (sin simulación)</td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Saldo proyectado básico</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-foreground">Privacidad & Propiedad de Datos</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-primary bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>100% tu base de datos (PostgreSQL propio)</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Nube propietaria de terceros</td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Nube de terceros (Riesgo Open Banking)</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-foreground">Multi-Moneda Consolidada</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-primary bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>ARS, USD, EUR + Arbitraje en Transferencias</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Parcial (sin arbitraje ágil)</td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Soporta multi-divisa</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-foreground">Tarjetas de Crédito & Cuotas</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-primary bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Cierres, vencimientos y cuotas diferidas reales</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Buen soporte de tarjetas</td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Deficiente para compras en cuotas</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-foreground">Modelo de Costos</td>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-primary bg-primary/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Gratis y Open-Source para siempre</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Suscripción mensual/anual costosa</td>
                <td className="py-3.5 px-4 sm:px-6 text-muted-foreground">Suscripción Premium recurrente</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Self-Host Callout */}
      <section className="py-12 px-4 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl gradient-card border border-border/60 p-8 text-center relative">
          <h3 className="text-2xl font-display font-bold text-foreground mb-3">
            ¿Querés tu propia instancia privada de DOM?
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            Podés desplegarla en 5 minutos en Vercel conectada a una base de datos gratuita de Supabase, 
            o ejecutarla 100% en tu computadora mediante Docker.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs active:scale-95 transition-all"
            >
              <Github className="w-4 h-4" />
              Ver Guía de Despliegue en README
            </a>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border/60 transition-all"
            >
              Entrar a mi Instancia
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/50 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>DOM - El dominio no se conquista. Se administra.</p>
      </footer>
    </div>
  );
}
