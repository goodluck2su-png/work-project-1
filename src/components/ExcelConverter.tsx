import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Sparkles,
  ArrowRight,
  Trash2,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { parseExcelFile, createExcelFile, transformData, ExcelData } from '../services/excelService';
import { analyzeExcelWithAI } from '../services/geminiService';

export const ExcelConverter: React.FC = () => {
  const { user, signOut } = useAuth();
  const [sourceData, setSourceData] = useState<ExcelData | null>(null);
  const [targetFormat, setTargetFormat] = useState('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    try {
      const sheets = await parseExcelFile(file);
      if (sheets.length > 0) {
        setSourceData(sheets[0]);
        setColumnMapping({});
        setSuggestions([]);
      }
    } catch (error) {
      console.error('파일 처리 오류:', error);
      alert('파일을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!sourceData || !targetFormat) return;

    setAnalyzing(true);
    try {
      const result = await analyzeExcelWithAI(
        sourceData.headers,
        sourceData.rows,
        targetFormat
      );
      setColumnMapping(result.columnMapping);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!sourceData || Object.keys(columnMapping).length === 0) return;

    const outputHeaders = Object.keys(columnMapping);
    const transformed = transformData(sourceData, columnMapping, outputHeaders);
    createExcelFile([transformed], '변환된_파일.xlsx');
  };

  const handleReset = () => {
    setSourceData(null);
    setTargetFormat('');
    setColumnMapping({});
    setSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Excel Formatter</h1>
              <p className="text-xs text-zinc-500">AI 엑셀 변환기</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user?.email}</span>
            <button
              onClick={signOut}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-500" />
              엑셀 파일 업로드
            </h2>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-400 mb-2">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-zinc-600">.xlsx, .xls, .csv 지원</p>
            </div>

            {/* Source Data Preview */}
            <AnimatePresence>
              {sourceData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-900/50 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-emerald-400">
                      {sourceData.sheetName}
                    </h3>
                    <button
                      onClick={handleReset}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {sourceData.headers.map((header, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left text-zinc-400 font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sourceData.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-white/5">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-zinc-300">
                                {cell?.toString() || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sourceData.rows.length > 5 && (
                      <p className="text-xs text-zinc-500 mt-2 text-center">
                        외 {sourceData.rows.length - 5}개 행...
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transform Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500" />
              AI 변환 설정
            </h2>

            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  원하는 출력 서식 설명
                </label>
                <textarea
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  placeholder="예: 이름, 부서, 직급, 연락처, 이메일 순서로 정리된 직원 명부"
                  className="w-full h-32 px-4 py-3 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!sourceData || !targetFormat || analyzing}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    AI로 분석하기
                  </>
                )}
              </button>
            </div>

            {/* Mapping Result */}
            <AnimatePresence>
              {Object.keys(columnMapping).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 space-y-4"
                >
                  <h3 className="font-medium text-teal-400">컬럼 매핑 결과</h3>
                  <div className="space-y-2">
                    {Object.entries(columnMapping).map(([target, source]) => (
                      <div
                        key={target}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-300">
                          {source}
                        </span>
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                        <span className="px-2 py-1 bg-teal-900/50 rounded text-teal-300">
                          {target}
                        </span>
                      </div>
                    ))}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <h4 className="text-sm text-zinc-400 mb-2">AI 제안</h4>
                      <ul className="space-y-1">
                        {suggestions.map((suggestion, i) => (
                          <li key={i} className="text-sm text-zinc-300">
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={handleDownload}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    변환된 파일 다운로드
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};
