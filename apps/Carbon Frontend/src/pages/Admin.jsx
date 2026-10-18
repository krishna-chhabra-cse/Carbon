// Owner's page: the early-access list. Needs the ADMIN_TOKEN set on the
// backend. The token is only kept in memory (gone when the tab closes) and is
// never put in the URL.
import { useEffect, useState } from 'react';
import { Download, Loader2, Lock } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import { API_URL } from '../lib/api';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Admin() {
  const [token, setToken] = useState('');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Admin · Carbon';
  }, []);

  const load = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/early-access`, { headers: { Authorization: `Bearer ${token.trim()}` } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) throw new Error('The admin page is switched off on the server (ADMIN_TOKEN is not set).');
      if (!res.ok) throw new Error(data.error || 'Could not load the list.');
      setRows(data.rows);
    } catch (err) {
      setRows(null);
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const head = ['email', 'wants', 'url', 'source', 'created_at', 'updated_at'];
    const lines = [head.join(','), ...rows.map((r) => head.map((k) => csvCell(r[k])).join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'early-access.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SiteShell title="Admin">
      <section className="cx-wrap pt-14 md:pt-20 pb-20">
        <div className="cx-label mb-3">Owner only</div>
        <h1 className="cx-h1 text-4xl md:text-5xl">Early-access list</h1>
        <form onSubmit={load} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="relative flex-1">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--cx-dim)' }} />
            <input className="cx-input" style={{ paddingLeft: 42 }} type="password" placeholder="Admin token" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" aria-label="Admin token" />
          </div>
          <button className="cx-btn cx-btn-primary" disabled={busy || !token.trim()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} Show list
          </button>
        </form>
        {error ? <p role="status" className="mt-4 text-sm" style={{ color: 'var(--cx-red)' }}>{error}</p> : null}

        {rows ? (
          <div className="mt-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-lg font-semibold">{rows.length} {rows.length === 1 ? 'person' : 'people'}</div>
              {rows.length ? <button className="cx-btn cx-btn-ghost" style={{ height: 38 }} onClick={download}><Download size={15} /> Download CSV</button> : null}
            </div>
            {rows.length === 0 ? (
              <p className="mt-4" style={{ color: 'var(--cx-muted)' }}>No one yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto cx-scroll cx-card">
                <table className="w-full text-sm text-left">
                  <thead style={{ color: 'var(--cx-dim)' }}>
                    <tr>{['Email', 'What they’d make', 'Link', 'Where', 'Joined'].map((h) => <th key={h} className="p-3 font-medium cx-mono text-xs uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.email} className="border-t align-top" style={{ borderColor: 'var(--cx-line)' }}>
                        <td className="p-3 break-all">{r.email}</td>
                        <td className="p-3" style={{ color: 'var(--cx-muted)', minWidth: 220 }}>{r.wants || '–'}</td>
                        <td className="p-3 break-all cx-mono text-xs" style={{ color: 'var(--cx-muted)' }}>{r.url || '–'}</td>
                        <td className="p-3 cx-mono text-xs" style={{ color: 'var(--cx-dim)' }}>{r.source}</td>
                        <td className="p-3 cx-mono text-xs whitespace-nowrap" style={{ color: 'var(--cx-dim)' }}>{r.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
