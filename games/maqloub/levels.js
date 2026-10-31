// مراحل لعبة "مقلوب"
// كل مرحلة شبكة مكعبات: 0 = فاضي، 1 = حجر.
// الإحداثيات (x, y, z) بوحدة المكعب، و y هي "فوق" عند البداية.

function makeLevel(W, H, D) {
  const grid = new Uint8Array(W * H * D);
  const L = {
    W, H, D, grid,
    plates: [], doors: [], exit: null,
    spawn: [2, 1, 3], spawnF: [1, 0, 0],
    name: '', hint: '', hue: 0.62,
  };
  const inB = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
  L.set = (x, y, z, t) => { if (inB(x, y, z)) grid[x + W * (y + H * z)] = t; };
  L.fill = (x0, y0, z0, x1, y1, z1, t = 1) => {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) L.set(x, y, z, t);
  };
  L.shell = () => { L.fill(0, 0, 0, W - 1, H - 1, D - 1, 1); L.fill(1, 1, 1, W - 2, H - 2, D - 2, 0); };
  // زر ضغط: cell = الخلية الفاضية فوق السطح، n = الاتجاه الطالع من السطح
  L.plate = (id, cell, n, latch = false) => L.plates.push({ id, cell, n, latch });
  // باب: مجموعة خلايا بتصير فاضية لما تنضغط الأزرار
  L.door = (cells, plates, mode = 'any', stay = false) => {
    for (const c of cells) L.set(c[0], c[1], c[2], 0);
    L.doors.push({ cells, plates, mode, stay });
  };
  L.setExit = (min, max) => { L.exit = { min, max }; };
  return L;
}

function boxCells(x0, y0, z0, x1, y1, z1) {
  const out = [];
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y, z]);
  return out;
}

// 1) أول قلبة: حيط عالي بالنص، والحل تمشي على السقف
function level1() {
  const L = makeLevel(14, 9, 7);
  L.name = 'أول قلبة';
  L.hint = 'الحيط عالي كثير… اضغط G (أو كبسة الماوس اليمين) واقلب الجاذبية وامشِ على السقف';
  L.hue = 0.62;
  L.shell();
  L.fill(6, 1, 1, 7, 5, 5);           // الحاجز
  L.spawn = [2, 1, 2];
  L.setExit([10, 1, 2], [11, 1, 4]);
  return L;
}

// 2) على الحيطان: جورة بالأرض وما في سقف، لازم تمشي على الحيط
function level2() {
  const L = makeLevel(22, 8, 7);
  L.name = 'على الحيطان';
  L.hint = 'طالع على الحيط وصوّب عليه بالنقطة اللي بالنص واضغط F (أو كبسة يسار). الحيط بصير أرضك';
  L.hue = 0.08;
  L.fill(0, 0, 0, 21, 7, 6, 1);
  L.fill(1, 1, 1, 20, 7, 5, 0);       // بدون سقف
  L.fill(7, 0, 1, 14, 0, 5, 0);       // الجورة
  L.fill(11, 2, 0, 12, 6, 0, 0);      // فتحة بالحيط اليمين، انتبه
  L.fill(9, 3, 6, 9, 6, 6, 0);        // فتحة بالحيط الثاني
  L.fill(16, 3, 1, 16, 4, 1, 1);      // نتوء صغير
  L.spawn = [2, 1, 2];
  L.setExit([17, 1, 2], [19, 1, 4]);
  return L;
}

// 3) تعاون: الباب بنفتح بس وانت واقف على الزر
function level3() {
  const L = makeLevel(16, 7, 7);
  L.name = 'إيد وحدة ما بتسقّف';
  L.hint = 'الباب بضل مفتوح بس طول ما في حدا على زر. واحد يوقف على زر السقف والثاني يعدّي ويوقف على زر الحيط';
  L.hue = 0.33;
  L.shell();
  L.fill(8, 1, 1, 8, 5, 5);           // الحيط الفاصل
  L.door([[8, 1, 3], [8, 2, 3]], ['a', 'b']);
  L.plate('a', [5, 5, 1], [0, -1, 0]); // زر على السقف
  L.plate('b', [11, 3, 5], [0, 0, -1]); // زر على الحيط
  L.spawn = [2, 1, 2];
  L.setExit([13, 1, 2], [14, 1, 4]);
  return L;
}

// 4) بنفس اللحظة: زرّين لازم ينضغطوا مع بعض
function level4() {
  const L = makeLevel(14, 9, 9);
  L.name = 'بنفس اللحظة';
  L.hint = 'الباب البرتقالي بدّه الزرّين ينضغطوا مع بعض: واحد على السقف وواحد على الحيط. بعدها بضل مفتوح';
  L.hue = 0.78;
  L.shell();
  L.fill(10, 1, 1, 10, 7, 7);
  L.door([[10, 1, 4], [10, 2, 4]], ['a', 'b'], 'all', true);
  L.plate('a', [3, 7, 2], [0, -1, 0]);  // سقف
  L.plate('b', [1, 4, 7], [1, 0, 0]);   // حيط
  L.fill(5, 1, 5, 6, 2, 6);             // مكعب بالنص
  L.spawn = [2, 1, 2];
  L.setExit([11, 1, 3], [12, 1, 5]);
  return L;
}

// 5) البرج: اطلع على الحيطان للسقف، وانزل على الرف المسكّر
function level5() {
  const L = makeLevel(8, 22, 8);
  L.name = 'البرج';
  L.hint = 'اطلع على الحيط للسقف. الغطا فوق الرف بنفتح من زر الأرض، واللي بوصل جوا بفتحه لصاحبه من زر جوا';
  L.hue = 0.52;
  L.shell();
  L.fill(1, 11, 1, 6, 12, 2);   // نتوء على الحيط القريب
  L.fill(1, 14, 5, 6, 15, 6);   // نتوء على الحيط البعيد
  L.fill(1, 6, 1, 6, 6, 1);     // درجة صغيرة
  // الرف: صندوق ملزوق بالحيط x=0
  L.fill(1, 16, 2, 4, 16, 6);   // أرضية الرف
  L.fill(4, 17, 2, 4, 18, 6);   // جانب
  L.fill(1, 17, 2, 3, 18, 2);   // جانب
  L.fill(1, 19, 2, 4, 19, 6);   // إطار الغطا
  L.door(boxCells(1, 19, 3, 3, 19, 6), ['a', 'b']);
  L.plate('a', [5, 1, 5], [0, 1, 0]);
  L.plate('b', [3, 17, 6], [0, 1, 0]);
  L.spawn = [2, 1, 4];
  L.spawnF = [0, 0, -1];
  L.setExit([1, 17, 3], [2, 17, 5]);
  return L;
}

export const LEVELS = [level1, level2, level3, level4, level5];
