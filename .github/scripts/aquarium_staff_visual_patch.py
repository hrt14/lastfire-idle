from pathlib import Path

path = Path("components/Shop.tsx")
src = path.read_text()
old = '''              if (worker.kind === "explorer") {
                // 探索者・追跡者: つばの広い日よけと、遠くを指す手
                ctx.fillStyle = "#3f5a5f";
                roundRect(ctx, wx - 11, wy - 26, 22, 4, 2);
                ctx.fill();
                roundRect(ctx, wx - 7, wy - 32, 14, 7, 3);
                ctx.fill();
                ctx.strokeStyle = "#e0d6bd";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wx + 6 * face, wy - 10);
                ctx.lineTo(wx + 17 * face, wy - 16);
                ctx.stroke();
              }
'''
new = '''              if (worker.kind === "explorer") {
                if (isAquarium) {
                  // 水族館の発見・調査スタッフ。
                  // 白服＋大きな帽子のコックと混同しないよう、色・帽子・道具・発見マークをすべて分ける。
                  // 青緑のフィールドベスト
                  ctx.fillStyle = "#247d7b";
                  roundRect(ctx, wx - 9, wy - 16, 18, 19, 6);
                  ctx.fill();
                  ctx.fillStyle = "#164b58";
                  roundRect(ctx, wx - 7, wy - 13, 14, 4, 2);
                  ctx.fill();
                  // 胸のスタッフID
                  ctx.fillStyle = "#d8f4ef";
                  roundRect(ctx, wx + 1, wy - 12, 5, 3.5, 1);
                  ctx.fill();

                  // 低いカーキのフィールドキャップ。コック帽のように上へ膨らませない。
                  ctx.fillStyle = "#b5a26e";
                  roundRect(ctx, wx - 7, wy - 30, 14, 5.5, 2.5);
                  ctx.fill();
                  ctx.fillStyle = "#8f7d50";
                  roundRect(ctx, wx - 9 * face, wy - 26, 14, 2.8, 1.4);
                  ctx.fill();

                  // 片手のクリップボード。『料理を運ぶ人』ではなく『調査する人』と読める形にする。
                  ctx.save();
                  ctx.translate(wx + 11 * face, wy - 7);
                  ctx.rotate(0.13 * face);
                  ctx.fillStyle = "#d8c898";
                  roundRect(ctx, -5, -7, 10, 13, 2);
                  ctx.fill();
                  ctx.fillStyle = "#6d6041";
                  roundRect(ctx, -2.5, -8, 5, 2.5, 1);
                  ctx.fill();
                  ctx.strokeStyle = "rgba(55,73,68,0.75)";
                  ctx.lineWidth = 1;
                  for (const yy of [-3, 0, 3]) {
                    ctx.beginPath();
                    ctx.moveTo(-2.5, yy);
                    ctx.lineTo(2.5, yy);
                    ctx.stroke();
                  }
                  ctx.restore();

                  // 発見のキラッ。小さくても役割が一目で分かる。
                  const sparkle = 0.65 + Math.abs(Math.sin(time * 4 + worker.id)) * 0.35;
                  ctx.save();
                  ctx.globalAlpha = sparkle;
                  ctx.strokeStyle = "#7ee7d5";
                  ctx.lineWidth = 1.6;
                  const sx = wx - 13 * face;
                  const sy = wy - 27;
                  ctx.beginPath();
                  ctx.moveTo(sx - 4, sy);
                  ctx.lineTo(sx + 4, sy);
                  ctx.moveTo(sx, sy - 4);
                  ctx.lineTo(sx, sy + 4);
                  ctx.stroke();
                  ctx.restore();
                } else {
                  // 探索者・追跡者: つばの広い日よけと、遠くを指す手
                  ctx.fillStyle = "#3f5a5f";
                  roundRect(ctx, wx - 11, wy - 26, 22, 4, 2);
                  ctx.fill();
                  roundRect(ctx, wx - 7, wy - 32, 14, 7, 3);
                  ctx.fill();
                  ctx.strokeStyle = "#e0d6bd";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(wx + 6 * face, wy - 10);
                  ctx.lineTo(wx + 17 * face, wy - 16);
                  ctx.stroke();
                }
              }
'''
if old not in src:
    raise SystemExit("explorer render block not found")
src = src.replace(old, new, 1)
path.write_text(src)
print("patched aquarium discovery staff visual")
