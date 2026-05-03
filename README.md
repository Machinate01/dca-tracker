# DCA Tracker

แอปติดตาม Bitcoin DCA รายวันในหน่วย THB — local-first, ไม่ต้องมี account, ไม่ต้อง deploy รันบนเครื่องตัวเองผ่าน Next.js dev server

ดึงราคา BTC/THB แบบ live จาก Bitkub API (ไม่ต้องมี API key)

---

## สิ่งที่ต้องมีก่อน

| ซอฟต์แวร์ | เวอร์ชันขั้นต่ำ | ตรวจสอบ |
|---|---|---|
| [Node.js](https://nodejs.org) | 20 LTS ขึ้นไป | `node -v` |
| npm | มากับ Node.js | `npm -v` |
| macOS | 12 ขึ้นไป | (สำหรับ `.command` launcher) |

---

## วิธีติดตั้ง

### 1. Clone โปรเจค

```bash
git clone https://github.com/sdpongp-maker/dca-tracker-demo-.git
cd dca-tracker-demo
```

### 2. ติดตั้ง dependencies

```bash
npm install
```

### 3. เปิดใช้งาน

มี 2 วิธี:

---

## วิธีใช้งาน

### วิธีที่ 1 — Double-click launcher (แนะนำ)

ไฟล์ **`DCA Tracker.command`** คือ launcher แบบ TUI (Terminal UI) สำหรับ macOS

**ครั้งแรก** ต้องให้สิทธิ์รันไฟล์ก่อน:

```bash
chmod +x "DCA Tracker.command"
```

จากนั้น **double-click** ไฟล์ `DCA Tracker.command` ใน Finder ได้เลย

Terminal จะเปิดขึ้นพร้อม menu:

```
  ▸ Status
    Restart Dev Server
    Logs: Dev Server
    Open Browser
    Quit
```

**ปุ่มที่ใช้:**

| ปุ่ม | การทำงาน |
|---|---|
| `↑` / `↓` หรือ `k` / `j` | เลื่อน cursor ขึ้น/ลง |
| `Enter` | เลือก menu item |
| `q` | ออกจากโปรแกรม (และหยุด dev server) |

**Menu items:**

- **Status** — ดูสถานะ dev server (PID, port, uptime, URL)
- **Restart Dev Server** — restart Next.js
- **Logs: Dev Server** — ดู log ย้อนหลัง 40 บรรทัด (กด `r` เพื่อ refresh)
- **Open Browser** — เปิด `http://localhost:1080` ใน browser
- **Quit** — ปิด launcher และหยุด dev server

> **หมายเหตุ:** ถ้า port 3000 มีอะไรรันอยู่แล้ว launcher จะ "adopt" process นั้นแทนการ start ใหม่ เมื่อ quit launcher process นั้นจะยังคงรันอยู่

---

### วิธีที่ 2 — Terminal ธรรมดา

```bash
npm run dev
```

จากนั้นเปิด [http://localhost:1080](http://localhost:1080)

---

## คำสั่งอื่น ๆ

```bash
npm run build      # build production (ใช้ตรวจสอบ error)
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

---

## ข้อมูล

- **ฐานข้อมูล:** SQLite ไฟล์ `data/dca.db` สร้างอัตโนมัติตอน request แรก (gitignored)
- **ราคา BTC:** ดึงจาก Bitkub API แบบ real-time ผ่าน `/api/price`
- **ข้อมูลทั้งหมดอยู่บนเครื่องตัวเอง** ไม่มีการส่งออกไปที่ไหน

---

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- better-sqlite3
- Bitkub API (ราคา BTC/THB)
