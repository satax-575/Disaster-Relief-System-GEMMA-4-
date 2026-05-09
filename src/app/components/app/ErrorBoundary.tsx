import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message:  string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "An unexpected error occurred." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RAKSHAK] ErrorBoundary caught:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive text-xl">
            ⚠
          </div>
          <div>
            <p className="text-foreground font-semibold text-base">Something went wrong</p>
            <p className="text-muted-foreground/60 text-sm mt-1 max-w-xs">
              {this.state.message}
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="text-sm text-primary hover:underline transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
