import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CentralizedErrorHandler } from '@/lib/centralized-error-handler';
import { RefreshIcon, Copy01Icon, Alert01Icon } from 'hugeicons-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler = CentralizedErrorHandler.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorResponse = this.errorHandler.handleError(error, {
      component: this.props.context || 'ErrorBoundary',
      operation: 'component_crash',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    // Error handling - production logging
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  handleReportError = async () => {
    const { error, errorId } = this.state;
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      // Copy to clipboard for user to share
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      alert('Error details copied to clipboard. Please share with support.');
    } catch (err) {
      // Fallback if clipboard API fails
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy error details. Please manually copy the error ID: ' + errorId);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[9999] min-h-screen flex items-center justify-center p-4 bg-background pointer-events-auto">
          <Card className="w-full max-w-lg shadow-lg border-destructive/20 pointer-events-auto relative">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Alert01Icon className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">Oops! Something went wrong</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                We encountered an unexpected error while processing your request. Don't worry, this is usually temporary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-muted-foreground/20">
                <AlertDescription className="text-center">
                  <span className="font-medium">Error ID:</span> <code className="bg-muted px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertDescription className="text-xs font-mono text-orange-800 break-all">
                    <strong>Dev Error:</strong> {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button 
                  type="button"
                  onClick={this.handleRetry} 
                  className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
                >
                  <RefreshIcon className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    onClick={() => window.location.reload()} 
                    variant="secondary" 
                    className="flex-1 cursor-pointer"
                  >
                    <RefreshIcon className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button 
                    type="button"
                    onClick={this.handleReportError} 
                    variant="outline" 
                    className="flex-1 cursor-pointer"
                  >
                    <Copy01Icon className="w-4 h-4 mr-2" />
                    Copy Error Details
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  If this error persists, please contact support with the error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
