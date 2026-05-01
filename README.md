# Vercel RAG (Next.js + Supabase + Gemini)

這個專案為一個可部署於 Vercel 的 RAG 範例骨架（Next.js App Router）。目前只接受 `.txt` 與 `.md` 上傳。

快速開始：

1. 複製 `.env.local.example` 為 `.env.local`，填入必要的金鑰。
2. 安裝套件：

```bash
npm install
```

3. 本地開發：

```bash
npm run dev
```

重要：請先在 Supabase SQL Editor 執行 migration，建立 `vector` extension、`documents`、`chunks` 表（README 下方有範例 SQL）。

範例 SQL：

```sql
create extension if not exists vector;

create table if not exists documents (
  id serial primary key,
  filename text not null,
  mime_type text,
  size bigint,
  storage_path text,
  pages int,
  created_at timestamptz default now()
);

create table if not exists chunks (
  id bigserial primary key,
  document_id int references documents(id) on delete cascade,
  chunk_index int,
  text text,
  start_offset int,
  end_offset int,
  embedding vector(768),
  metadata jsonb,
  created_at timestamptz default now()
);

-- 建立向量索引（依 pgvector 與 supabase 支援的 index 類型）
-- CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

說明與 TODO：
- `app/api/*` 已提供基本路由骨架：`upload`, `process`, `query`。
- 上傳端現在僅允許 `.txt` 與 `.md`，並直接以 UTF-8 文字解析。
- 你需要在 Supabase 上建立 table 並填入 `.env.local` 後才能完整測試。
