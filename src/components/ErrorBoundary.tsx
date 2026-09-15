import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Fallback personalizado opcional. Si no se provee, se muestra el UI por defecto. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Global — DOM (FEAT-S9)
 *
 * Captura cualquier error de JavaScript no manejado en el árbol de componentes
 * y muestra una pantalla de recuperación amigable en lugar de una pantalla en blanco.
 *
 * Casos cubiertos:
 * - tx.date.getMonth() sobre un valor null/undefined
 * - Errores de render en Recharts con datos malformados
 * - Cualquier excepción no capturada en un componente hijo
 *
 * Uso:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Loguear en consola con contexto completo para diagnóstico
    console.error("[DOM ErrorBoundary] Error no capturado:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-6">
            {/* Icono */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Mensaje principal */}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                Algo salió mal
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                DOM encontró un error inesperado. Tus datos están seguros — podés recargar la página para continuar.
              </p>
            </div>

            {/* Error técnico (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="text-left bg-muted/50 rounded-xl p-3 overflow-auto max-h-32">
                <p className="text-[11px] font-mono text-destructive/80 break-all whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar app
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98] transition-transform"
              >
                <Home className="w-4 h-4" />
                Ir al inicio
              </button>
            </div>

            <p className="text-xs text-muted-foreground/60">
              Si el problema persiste, contactá soporte con el código:{" "}
              <span className="font-mono">
                {Date.now().toString(36).toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
