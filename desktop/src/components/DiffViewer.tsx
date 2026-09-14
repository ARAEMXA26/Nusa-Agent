import React from 'react';

interface DiffViewerProps {
  diff: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  if (!diff) {
    return <div className="p-4 text-xs text-neutral-500 font-mono">No diff content available.</div>;
  }

  const lines = diff.split('\n');

  return (
    <div className="bg-neutral-950 font-mono text-xs overflow-x-auto rounded border border-neutral-800">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            let rowStyle = 'text-neutral-400';
            let bgStyle = 'hover:bg-neutral-900/40';

            if (line.startsWith('+++') || line.startsWith('---')) {
              rowStyle = 'text-sky-400 font-semibold';
              bgStyle = 'bg-sky-950/20';
            } else if (line.startsWith('@@')) {
              rowStyle = 'text-cyan-400';
              bgStyle = 'bg-cyan-950/20';
            } else if (line.startsWith('+')) {
              rowStyle = 'text-emerald-400';
              bgStyle = 'bg-emerald-950/30';
            } else if (line.startsWith('-')) {
              rowStyle = 'text-rose-400';
              bgStyle = 'bg-rose-950/30';
            }

            return (
              <tr key={idx} className={`${bgStyle} leading-tight`}>
                <td className="w-10 px-2 py-0.5 text-right text-neutral-600 select-none border-r border-neutral-800/60">
                  {idx + 1}
                </td>
                <td className={`px-3 py-0.5 whitespace-pre ${rowStyle}`}>
                  {line || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
