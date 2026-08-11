from pathlib import Path

path = Path("components/Shop.tsx")
source = path.read_text(encoding="utf-8")

import_anchor = 'import { drawAquariumHall } from "@/lib/aquariumTheme";\n'
import_insert = import_anchor + 'import { drawFireGraphicPass, drawTaigaGraphicPass } from "@/lib/worldGraphicPass";\n'
if import_anchor not in source:
    raise SystemExit("import anchor not found")
source = source.replace(import_anchor, import_insert, 1)

river_anchor = "\n".join([
    "      /*",
    "       * 大河。区画をまたいで、世界のはしからはしまで流れている。",
    "       * 水くみ場や取水口はこの岸に立ち、運搬船はこの上を行き来する。",
    "       * 季節で水かさが変わる（雨季は岸に迫り、乾季は川原が広がる）",
    "       */",
    "",
])
fire_insert = "\n".join([
    "      if (isFire) {",
    "        drawFireGraphicPass(",
    "          ctx,",
    "          box,",
    "          openAreas(state),",
    "          effectsRef.current ? time : 0,",
    "          effectsRef.current,",
    "        );",
    "      }",
    "",
]) + river_anchor
if river_anchor not in source:
    raise SystemExit("river anchor not found")
source = source.replace(river_anchor, fire_insert, 1)

snow_anchor = "      // 冬が来ると、地面が少しずつ白くなる（第4区画）\n"
taiga_insert = "\n".join([
    "      if (isTaiga) {",
    "        drawTaigaGraphicPass(",
    "          ctx,",
    "          box,",
    "          openAreas(state),",
    "          effectsRef.current ? time : 0,",
    "          effectsRef.current,",
    "          RIVER_LANE,",
    "          riverRise(state),",
    "        );",
    "      }",
    "",
]) + snow_anchor
if snow_anchor not in source:
    raise SystemExit("snow anchor not found")
source = source.replace(snow_anchor, taiga_insert, 1)

path.write_text(source, encoding="utf-8")
