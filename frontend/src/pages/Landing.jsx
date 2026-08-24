import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileSearch, Sparkles, ShieldCheck, Search, BookOpen, MessageSquare,
  Upload, ArrowRight, Lock, BarChart3, CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  { icon: Search, title: 'BM25 + TF-IDF retrieval', desc: 'Every answer is retrieved from your document using established information-retrieval math, ranked and scored in the open.' },
  { icon: BookOpen, title: 'Extractive summaries', desc: 'Summaries are built from TextRank sentence ranking — real sentences from your document, never invented ones.' },
  { icon: MessageSquare, title: 'Conversational interface', desc: 'Ask follow-up questions in a familiar chat layout, with sources cited for every answer.' },
  { icon: ShieldCheck, title: 'No generative model', desc: 'Nothing is hallucinated because nothing is generated. If it isn\u2019t in your document, DocumentAI says so.' },
];

const STEPS = [
  { n: '01', title: 'Upload', desc: 'Drop in a PDF, Word doc, or text file. DocumentAI extracts and cleans the text automatically.' },
  { n: '02', title: 'Index', desc: 'The engine builds TF-IDF and BM25 indexes and scores every sentence for importance.' },
  { n: '03', title: 'Ask', desc: 'Ask questions in plain language. Answers are pulled directly from the ranked passages.' },
  { n: '04', title: 'Verify', desc: 'Jump straight to the source page and see the exact sentence an answer came from.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas dark:bg-dark-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 backdrop-blur-md dark:bg-dark-surface/80 dark:border-dark-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <FileSearch size={17} />
            </div>
            <span className="font-display text-[17px] font-bold text-ink dark:text-dark-ink">DocumentAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted dark:text-dark-muted">
            <a href="#how-it-works" className="hover:text-ink dark:hover:text-dark-ink transition-colors">How it works</a>
            <a href="#features" className="hover:text-ink dark:hover:text-dark-ink transition-colors">Features</a>
            <a href="#no-llm" className="hover:text-ink dark:hover:text-dark-ink transition-colors">No-LLM architecture</a>
            <a href="#faq" className="hover:text-ink dark:hover:text-dark-ink transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary !py-2 !px-4">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,91,255,0.10),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light dark:bg-primary/10 dark:border-primary/20 px-3.5 py-1.5 text-xs font-semibold text-primary mb-6">
            <Sparkles size={13} /> Traditional NLP. Zero generative AI.
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-4xl md:text-5xl font-extrabold tracking-tight text-ink dark:text-dark-ink leading-[1.1]">
            Understand your documents.
            <br />
            Ask questions. Find answers.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base md:text-lg text-muted dark:text-dark-muted">
            Upload your documents and explore them through intelligent search, extractive summarization, and retrieval — built on TF-IDF, BM25, and TextRank, not a language model.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register" className="btn-primary !px-6 !py-3 text-[15px]">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-secondary !px-6 !py-3 text-[15px]">Sign In</Link>
          </div>

          {/* Product visual */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="card p-3 md:p-4 animate-rise">
              <div className="rounded-xl border border-border dark:border-dark-border overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-border dark:border-dark-border bg-canvas dark:bg-dark-canvas px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                </div>
                <div className="grid grid-cols-5 text-left">
                  <div className="col-span-2 border-r border-border dark:border-dark-border p-4 space-y-3 bg-canvas/50 dark:bg-dark-canvas/50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted dark:text-dark-muted"><Upload size={13}/> Research_Report.pdf</div>
                    <div className="h-2 w-3/4 rounded bg-slate-200 dark:bg-dark-border" />
                    <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-dark-border" />
                    <div className="mt-4 space-y-2">
                      <div className="rounded-lg bg-primary-light dark:bg-primary/10 px-2.5 py-2 text-xs font-medium text-primary">Summarize this document</div>
                      <div className="rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border px-2.5 py-2 text-xs text-muted dark:text-dark-muted">What are the key findings?</div>
                    </div>
                  </div>
                  <div className="col-span-3 p-5 space-y-3">
                    <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-xs text-white">What is the refund policy?</div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-canvas dark:bg-dark-canvas px-3.5 py-2.5 text-xs text-ink dark:text-dark-ink space-y-2">
                      <p>According to the document, refunds are processed within 5–7 business days of approval.</p>
                      <div className="flex gap-1.5 text-[10px] font-medium text-primary">
                        <span className="rounded-md bg-primary-light dark:bg-primary/15 px-1.5 py-0.5">Page 4</span>
                        <span className="rounded-md bg-primary-light dark:bg-primary/15 px-1.5 py-0.5">Section: Refunds</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink dark:text-dark-ink">How it works</h2>
          <p className="mt-2 text-muted dark:text-dark-muted">Four steps, all deterministic and explainable.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-5">
              <span className="font-display text-2xl font-extrabold text-primary/25">{s.n}</span>
              <h3 className="mt-2 font-display font-semibold text-ink dark:text-dark-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted dark:text-dark-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-surface dark:bg-dark-surface border-y border-border dark:border-dark-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-ink dark:text-dark-ink">Built for document intelligence</h2>
            <p className="mt-2 text-muted dark:text-dark-muted">Every feature is explainable, auditable, and grounded in your source material.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded-2xl hover:bg-canvas dark:hover:bg-dark-canvas transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light dark:bg-primary/10">
                  <f.icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-ink dark:text-dark-ink">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted dark:text-dark-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No-LLM badge section */}
      <section id="no-llm" className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light dark:bg-primary/10 mx-auto mb-5">
          <Lock size={20} className="text-primary" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-ink dark:text-dark-ink">
          Your documents. Your data.
          <br />No generative AI required.
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-muted dark:text-dark-muted">
          DocumentAI uses traditional NLP and information retrieval — TF-IDF, BM25, TextRank, and extractive question answering — instead of a large language model. Answers are pulled directly from your documents, never generated from scratch.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-4 py-2 text-sm font-medium text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulseSoft" /> NLP Engine Active — 0 LLM calls
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-display text-2xl font-bold text-ink dark:text-dark-ink text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Does DocumentAI use ChatGPT or another LLM?', a: 'No. All retrieval, ranking, and summarization run on classic NLP algorithms (TF-IDF, BM25, TextRank) that execute locally against your uploaded text.' },
              { q: 'Can it answer questions the document doesn\u2019t cover?', a: 'No — and that\u2019s intentional. If no passage clears the relevance threshold, DocumentAI tells you it couldn\u2019t find the answer rather than guessing.' },
              { q: 'What file types are supported?', a: 'PDF, DOCX, and TXT today, with CSV support for tabular content.' },
              { q: 'Is my data used to train a model?', a: 'No models are trained on your documents. Text is indexed per-document, per-account, and never shared across users.' },
            ].map((item) => (
              <div key={item.q} className="card p-5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-ink dark:text-dark-ink text-sm">{item.q}</h3>
                    <p className="mt-1 text-sm text-muted dark:text-dark-muted">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <BarChart3 size={28} className="mx-auto text-primary mb-4" />
        <h2 className="font-display text-2xl md:text-3xl font-bold text-ink dark:text-dark-ink">Ready to explore your documents?</h2>
        <Link to="/register" className="btn-primary !px-6 !py-3 text-[15px] mt-6 inline-flex">
          Create your account <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="border-t border-border dark:border-dark-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted dark:text-dark-muted">
          <span>© {new Date().getFullYear()} DocumentAI. All rights reserved.</span>
          <span>Traditional NLP · No generative AI</span>
        </div>
      </footer>
    </div>
  );
}
