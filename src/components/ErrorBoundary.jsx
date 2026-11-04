import { Component } from 'react';

// Keeps one failing section (e.g. a Convex query error) from blanking the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <h3 style={{ marginBottom: 8 }}>{this.props.title ?? 'This section failed to load'}</h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>{String(this.state.error.message).split('\n')[0]}</p>
        <button className="btn btn-gold" onClick={() => this.setState({ error: null })}>Retry</button>
      </div>
    );
  }
}
