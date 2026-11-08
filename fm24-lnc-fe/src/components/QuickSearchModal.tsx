'use client';

import React, { useState, useEffect } from 'react';
import { quickSearch, getNationLogoUrl } from '../services/api';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: any, type: string) => void;
}

export default function QuickSearchModal({ isOpen, onClose, onSelectItem }: QuickSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    clubs: any[];
    competitions: any[];
    nations: any[];
    stadiums: any[];
    cities: any[];
    awards: any[];
    players: any[];
  }>({
    clubs: [],
    competitions: [],
    nations: [],
    stadiums: [],
    cities: [],
    awards: [],
    players: [],
  });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({
        clubs: [],
        competitions: [],
        nations: [],
        stadiums: [],
        cities: [],
        awards: [],
        players: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await quickSearch(searchTerm);
        setResults({
          clubs: res.clubs || [],
          competitions: res.competitions || [],
          nations: res.nations || [],
          stadiums: res.stadiums || [],
          cities: res.cities || [],
          awards: res.awards || [],
          players: res.players || [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isOpen) return null;

  const totalResults =
    results.clubs.length +
    results.competitions.length +
    results.nations.length +
    results.stadiums.length +
    results.cities.length +
    results.awards.length +
    results.players.length;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/60 p-2.5 pt-3 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-[95%] max-h-[95%] flex flex-col overflow-hidden border border-gray-200">
        <div className="p-3 border-b border-gray-200 shrink-0 flex items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="Search club, comp, nation, stadium, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border-none focus:outline-none placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold px-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded font-medium shrink-0"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-3 sm:p-4 space-y-4 flex-1">
          {loading && <div className="text-center text-xs text-gray-500 py-6">Searching...</div>}

          {!loading && searchTerm && totalResults === 0 && (
            <div className="text-center text-xs text-gray-400 py-6">
              No results found for &quot;{searchTerm}&quot;
            </div>
          )}

          {/* Clubs */}
          {results.clubs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Clubs ({results.clubs.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.clubs.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectItem(c, 'club');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-blue-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{c.name_lg || c.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {c.name_sh || c.name} {c.name_3l ? `(${c.name_3l})` : ''}{' '}
                        &bull; {c.nation?.name_sh || c.nation?.name_lg || 'Free Club'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {c.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitions */}
          {results.competitions.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Competitions ({results.competitions.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.competitions.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      onSelectItem(comp, 'competition');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-emerald-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-emerald-900">{comp.name_lg || comp.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {comp.name_sh || comp.name} &bull;{' '}
                        {comp.is_international ? 'International' : comp.nation?.name_sh || comp.nation?.name_lg}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {comp.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nations */}
          {results.nations.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Countries ({results.nations.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.nations.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onSelectItem(n, 'nation');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-amber-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5">
                      {getNationLogoUrl(n.id, n.name_3l) ? (
                        <img
                          src={getNationLogoUrl(n.id, n.name_3l)}
                          alt={n.name_sh || n.name_lg || n.name}
                          className="w-5 h-3.5 object-cover rounded-xs border border-slate-200 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div>
                        <div className="text-xs font-semibold text-gray-800">{n.name_lg || n.name}</div>
                        <div className="text-[11px] text-gray-500">
                          Code: {n.name_3l} &bull; {n.confed?.name}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      {n.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stadiums */}
          {results.stadiums.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Stadiums ({results.stadiums.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.stadiums.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectItem(s, 'stadium');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{s.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {s.nation?.name_sh || s.nation?.name_lg || 'Standard'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {s.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cities */}
          {results.cities.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Cities ({results.cities.length})
              </div>
              <div className="divide-y divide-gray-100">
                {results.cities.map((ci) => (
                  <div
                    key={ci.id}
                    onClick={() => {
                      onSelectItem(ci, 'city');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{ci.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {ci.nation?.name_sh || ci.nation?.name_lg} &bull; {ci.categories || 'Default'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {ci.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {results.awards.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-yellow-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Awards ({results.awards.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {results.awards.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      onSelectItem(a, 'award');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-yellow-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-yellow-950">{a.name_lg || a.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {a.name_sh || a.name} &bull;{' '}
                        {a.competition?.name_sh ||
                          a.competition?.name_lg ||
                          a.nation?.name_sh ||
                          a.nation?.name_lg ||
                          'Global Award'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      {a.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persons */}
          {results.players.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Person ({results.players.length})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {results.players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectItem(p, 'player');
                      onClose();
                    }}
                    className="py-2 px-2 hover:bg-purple-50 rounded cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-purple-950">
                        {p.first_name} {p.second_name} {p.common_name ? `("${p.common_name}")` : ''}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Person &bull; First: {p.first_name} | Last: {p.second_name}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {p.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
