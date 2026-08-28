---
title: 'Hello World'
description: 'Post pertama di blog pribadi saya, dibangun dengan Astro dan Markdown.'
pubDate: 'Aug 28 2026'
---

Selamat datang di blog pribadi saya. Blog ini dibangun menggunakan **Astro** dengan konten murni dari file Markdown.

## Kenapa Astro?

- Statis, cepat, SEO-friendly.
- Konten ditulis dalam Markdown standar.
- Syntax highlighting bawaan via Shiki.

## Contoh Kode

Berikut contoh kode JavaScript sederhana untuk memastikan syntax highlighting berfungsi:

```js
function greet(name) {
  const message = `Halo, ${name}!`;
  console.log(message);
  return message;
}

greet('Dunia');
```

Dan sedikit TypeScript:

```ts
interface Post {
  title: string;
  pubDate: Date;
}

const post: Post = {
  title: 'Hello World',
  pubDate: new Date('2026-08-28'),
};
```

## Selanjutnya

Tambahkan file `.md` baru di `src/content/blog/` untuk menulis post berikutnya. Frontmatter minimal: `title`, `description`, `pubDate`.
