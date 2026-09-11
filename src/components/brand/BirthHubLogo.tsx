import { useId } from 'react';

import { BRAND } from '../../config/brand';

/**
 * Marca Birth Hub 360 em SVG inline.
 *
 * GERADO por `identidade-visual/birthhub360/logos/*.svg` — não edite geometria
 * aqui. Os arquivos-mestre são a fonte de verdade (brand book, p. 04/05); este
 * componente existe só para renderizá-los sem uma requisição extra e sem o
 * flash de logo ausente que um `<img src>` produziria no primeiro paint (a
 * marca aparece no login e na sidebar, ou seja, no caminho crítico).
 *
 * Os ids de gradiente são sufixados por `useId()`: sem isso, duas instâncias na
 * mesma página (sidebar + topbar, por exemplo) emitiriam ids duplicados —
 * inválido em HTML e frágil se as definições um dia divergirem entre variantes.
 *
 * Variantes:
 * - `symbol` — emblema completo, com a coroa de traços. Use a partir de 96px.
 * - `icon` — redução estrutural (sem coroa, órbita mais grossa, "B" maior).
 *   É o que deve aparecer entre 32 e 96px; abaixo de 32px o brand book não
 *   autoriza uso.
 * - `horizontal` — emblema + logotipo. Assinatura institucional.
 *
 * Acessibilidade: por padrão a marca é decorativa (`aria-hidden`), porque quase
 * sempre aparece ao lado do nome da plataforma em texto. Passe `title` quando
 * ela for a única identificação visível — vira `role="img"` com nome acessível.
 */
export type BirthHubLogoVariant = 'symbol' | 'icon' | 'horizontal';

interface BirthHubLogoProps {
  variant?: BirthHubLogoVariant;
  className?: string;
  /** Nome acessível. Sem ele a marca é tratada como decorativa. */
  title?: string;
}

export function BirthHubLogo({ variant = 'icon', className, title }: BirthHubLogoProps) {
  const uid = useId().replace(/:/g, '');
  const labelling = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true, focusable: false as const };

  if (variant === 'horizontal') {
    return (
      <svg
        viewBox="0 0 946 256"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        {...labelling}
      >
        <defs>
          <linearGradient
            id={`bh-o0-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="127.14"
            y1="46.00"
            x2="199.44"
            y2="87.75"
          >
            <stop offset="0" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#986876" />
          </linearGradient>
          <linearGradient
            id={`bh-o1-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="198.58"
            y1="86.26"
            x2="198.58"
            y2="169.74"
          >
            <stop offset="0" stopColor="#986876" />
            <stop offset="1" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient
            id={`bh-o2-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="199.44"
            y1="168.25"
            x2="127.14"
            y2="210.00"
          >
            <stop offset="0" stopColor="#5B21B6" />
            <stop offset="1" stopColor="#2E43C4" />
          </linearGradient>
          <linearGradient
            id={`bh-o3-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="128.86"
            y1="210.00"
            x2="56.56"
            y2="168.25"
          >
            <stop offset="0" stopColor="#2E43C4" />
            <stop offset="1" stopColor="#0065D2" />
          </linearGradient>
          <linearGradient
            id={`bh-o4-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="57.42"
            y1="169.74"
            x2="57.42"
            y2="86.26"
          >
            <stop offset="0" stopColor="#0065D2" />
            <stop offset="1" stopColor="#6A8A84" />
          </linearGradient>
          <linearGradient
            id={`bh-o5-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="56.56"
            y1="87.75"
            x2="128.86"
            y2="46.00"
          >
            <stop offset="0" stopColor="#6A8A84" />
            <stop offset="1" stopColor="#D4AF37" />
          </linearGradient>
          <linearGradient id={`bh-bar-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#D4AF37" />
            <stop offset="0.45" stopColor="#D4AF37" stopOpacity="0.15" />
            <stop offset="0.55" stopColor="#D4AF37" stopOpacity="0.15" />
            <stop offset="1" stopColor="#D4AF37" />
          </linearGradient>
          <radialGradient id={`bh-sheen-${uid}`} cx="0.3" cy="0.25" r="0.55">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`bh-core-shade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000000" stopOpacity="0.55" />
            <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.06" />
          </linearGradient>

          <linearGradient id={`bh-gold-metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F7E9B8" />
            <stop offset="0.42" stopColor="#D4AF37" />
            <stop offset="0.68" stopColor="#8C6D1F" />
            <stop offset="1" stopColor="#EBD689" />
          </linearGradient>
        </defs>
        <g id={`bh-emblem-${uid}`}>
          <circle
            cx="128.0"
            cy="128.0"
            r="118.12"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="11.77"
            opacity="0.6"
            strokeDasharray="1.44 10.93"
          />
          <g fill="none" strokeWidth="16.0">
            <path stroke={`url(#bh-o0-${uid})`} d="M127.14 46.00 A82.0 82.0 0 0 1 199.44 87.75" />
            <path stroke={`url(#bh-o1-${uid})`} d="M198.58 86.26 A82.0 82.0 0 0 1 198.58 169.74" />
            <path stroke={`url(#bh-o2-${uid})`} d="M199.44 168.25 A82.0 82.0 0 0 1 127.14 210.00" />
            <path stroke={`url(#bh-o3-${uid})`} d="M128.86 210.00 A82.0 82.0 0 0 1 56.56 168.25" />
            <path stroke={`url(#bh-o4-${uid})`} d="M57.42 169.74 A82.0 82.0 0 0 1 57.42 86.26" />
            <path stroke={`url(#bh-o5-${uid})`} d="M56.56 87.75 A82.0 82.0 0 0 1 128.86 46.00" />
          </g>
          <circle cx="128.0" cy="128.0" r="90" fill={`url(#bh-sheen-${uid})`} />
          <circle cx="128.0" cy="128.0" r="74.0" fill="#0B132B" />
          <circle cx="128.0" cy="128.0" r="74.0" fill={`url(#bh-core-shade-${uid})`} />
          <circle cx="128.0" cy="128.0" r="61.5" fill="none" stroke="#D4AF37" strokeWidth="5.0" />
          <rect x="64.0" y="126.5" width="128.0" height="3.0" fill={`url(#bh-bar-${uid})`} />
          <path
            fill="#F8FAFC"
            transform="matrix(0.0740 0 0 -0.0740 104.45 154.20)"
            d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
          />
        </g>
        <g
          fill={`url(#bh-gold-metal-${uid})`}
          transform="translate(284.00 149.75) scale(0.02900 -0.02900)"
        >
          <path
            transform="translate(0.00 0)"
            d="M37.84 0V39H726.42Q805.1 39 863.82 84.5Q922.55 130 955.2 215.5Q987.86 301 987.86 420Q987.86 539 955.2 611.63Q922.55 684.27 863.82 717.27Q805.1 750.27 726.42 750.27H515.7V776H805.24Q968.2 776 1099.01 739.9Q1229.82 703.8 1306.68 619.58Q1383.53 535.36 1383.53 390.72Q1383.53 176.7 1231.86 88.35Q1080.18 0 805.24 0ZM218.58 19.39V1480.61H584.52V19.39ZM515.7 764V790H706.42Q775.1 790 829.82 820Q884.55 850 916.34 920Q948.12 990 948.12 1109Q948.12 1228 916.34 1306Q884.55 1384 829.82 1422.5Q775.1 1461 706.42 1461H37.84V1500H765.71Q1024.91 1500 1174.59 1412.5Q1324.27 1325 1324.27 1130Q1324.27 946.25 1182.46 855.12Q1040.65 764 765.71 764Z"
          />
          <path
            transform="translate(1883.79 0)"
            d="M37.84 0V39H258.58V1461H37.84V1500H864.25V1461H624.25V39H864.25V0Z"
          />
          <path
            transform="translate(3198.59 0)"
            d="M399.31 762.78V786.52H683.94Q779.94 786.52 843.41 820.16Q906.88 853.8 938.22 928.34Q969.56 1002.88 969.56 1126.52Q969.56 1250.16 938.22 1323.5Q906.88 1396.84 843.41 1428.92Q779.94 1461 683.94 1461H37.84V1500H757.14Q930.1 1500 1062.73 1460.7Q1195.36 1421.39 1270.53 1338.95Q1345.71 1256.52 1345.71 1126.52Q1345.71 996.52 1274.9 916.52Q1204.09 836.52 1072.09 799.65Q940.1 762.78 757.14 762.78ZM37.84 0V39H785.96V0ZM229.3 21V1481.05H594.98V21ZM1247.14 -17.32Q1138.18 -17.32 1075.4 14.91Q1012.63 47.14 982.58 101.74Q952.52 156.34 943.36 224.3Q934.2 292.27 933.57 364.73Q932.94 437.2 928.13 505.16Q923.33 573.12 902.26 627.72Q881.18 682.32 830.88 714.55Q780.58 746.78 688.58 746.78H399.31V767.78H904.25Q1040.67 767.78 1120.04 728.42Q1199.42 689.05 1238.03 624.05Q1276.64 559.05 1288.71 481.69Q1300.78 404.32 1300.45 326.95Q1300.12 249.59 1302.52 184.59Q1304.92 119.59 1324.16 80.22Q1343.39 40.86 1395.58 40.86Q1427.58 40.86 1454.28 47.72Q1480.98 54.59 1501.71 64.59L1514.98 26.86Q1490.98 13.86 1418.82 -1.73Q1346.66 -17.32 1247.14 -17.32Z"
          />
          <path
            transform="translate(5154.38 0)"
            d="M308.49 0V39H528.49V1461H443.42Q367.13 1461 306.77 1425.91Q246.42 1390.82 201.31 1328.54Q156.21 1266.26 125.81 1183.67Q95.41 1101.08 78.58 1006.08H37.84V1500H1384.09V1006.08H1345.09Q1328.98 1101.08 1298.22 1183.67Q1267.46 1266.26 1222.22 1328.54Q1176.98 1390.82 1116.62 1425.91Q1056.27 1461 979.98 1461H894.17V39H1114.17V0Z"
          />
          <path
            transform="translate(6989.17 0)"
            d="M1614.25 1500V1461H1434.25V39H1614.25V0H897.86V39H1068.58V720.73H584.52V39H754.98V0H37.84V39H218.58V1461H37.84V1500H754.98V1461H584.52V759.27H1068.58V1461H897.86V1500Z"
          />
          <path
            transform="translate(9967.76 0)"
            d="M1614.25 1500V1461H1434.25V39H1614.25V0H897.86V39H1068.58V720.73H584.52V39H754.98V0H37.84V39H218.58V1461H37.84V1500H754.98V1461H584.52V759.27H1068.58V1461H897.86V1500Z"
          />
          <path
            transform="translate(12032.55 0)"
            d="M1452.81 1500V1461H1264.54V460Q1264.54 213 1143.89 92Q1023.24 -29 775.26 -29Q483.32 -29 350.01 86Q216.7 201 216.7 460V1461H36.24V1500H782.65V1461H582.65V480Q582.65 381 593.49 298.33Q604.33 215.66 634.87 155.72Q665.42 95.78 722.21 62.61Q779 29.44 870.16 29.44Q972.2 29.44 1052.44 71.28Q1132.68 113.12 1178.88 207.7Q1225.08 302.27 1225.08 460V1461H1045.47V1500Z"
          />
          <path
            transform="translate(13939.34 0)"
            d="M37.84 0V39H726.42Q805.1 39 863.82 84.5Q922.55 130 955.2 215.5Q987.86 301 987.86 420Q987.86 539 955.2 611.63Q922.55 684.27 863.82 717.27Q805.1 750.27 726.42 750.27H515.7V776H805.24Q968.2 776 1099.01 739.9Q1229.82 703.8 1306.68 619.58Q1383.53 535.36 1383.53 390.72Q1383.53 176.7 1231.86 88.35Q1080.18 0 805.24 0ZM218.58 19.39V1480.61H584.52V19.39ZM515.7 764V790H706.42Q775.1 790 829.82 820Q884.55 850 916.34 920Q948.12 990 948.12 1109Q948.12 1228 916.34 1306Q884.55 1384 829.82 1422.5Q775.1 1461 706.42 1461H37.84V1500H765.71Q1024.91 1500 1174.59 1412.5Q1324.27 1325 1324.27 1130Q1324.27 946.25 1182.46 855.12Q1040.65 764 765.71 764Z"
          />
          <path
            transform="translate(16736.93 0)"
            d="M535.2 -20Q374.9 -20 267.06 34.08Q159.23 88.16 104.61 171.36Q50 254.56 50 341.2Q50 430.28 106.69 486.34Q163.38 542.4 243.2 542.4Q316.28 542.4 369.84 491.21Q423.4 440.02 423.4 358.2Q423.4 307.9 396.79 267.56Q370.17 227.23 327.84 203.61Q285.5 180 237.2 180Q189.9 180 147.56 202.11Q105.23 224.23 78.61 261.06Q52 297.9 52 341.2H90Q90 259.1 141.94 186.99Q193.89 114.89 279.37 70.64Q364.85 26.39 465.92 26.39Q559.3 26.39 617.7 74.37Q676.09 122.34 703.41 209.57Q730.72 296.8 730.72 414.64Q730.72 471.98 717.32 537.05Q703.92 602.12 669.5 659.93Q635.09 717.73 572.1 754.5Q509.1 791.27 409.92 791.27V816Q590.92 816 722.79 782.5Q854.66 749 940.16 691Q1025.66 633 1067.03 558Q1108.4 483 1108.4 400Q1108.4 303 1059.42 225Q1010.44 147 927.8 92.5Q845.16 38 743.18 9Q641.2 -20 535.2 -20ZM409.92 805.27V830Q501.84 830 554.46 863.37Q607.09 896.73 632 949.37Q656.92 1002 663.82 1060.57Q670.72 1119.14 670.72 1169.56Q670.72 1227.97 661.17 1281.83Q651.63 1335.7 630.61 1378.63Q609.59 1421.56 574.57 1446.72Q539.55 1471.88 488.6 1471.88Q442.31 1471.88 384.29 1453.78Q326.26 1435.68 272.65 1400.89Q219.03 1366.09 184.02 1317.87Q149 1269.65 149 1208.4H111Q111 1256.7 139.61 1294.17Q168.23 1331.64 211.56 1353.12Q254.9 1374.6 298.2 1374.6Q346.5 1374.6 388.84 1351.99Q431.17 1329.37 457.79 1289.04Q484.4 1248.7 484.4 1195.4Q484.4 1137.1 455.79 1095.76Q427.17 1054.43 384.34 1032.81Q341.5 1011.2 298.2 1011.2Q249.9 1011.2 206.56 1035.81Q163.23 1060.43 136.11 1104.76Q109 1149.1 109 1208.4Q109 1273.38 149.35 1329.83Q189.69 1386.29 255.6 1428.68Q321.51 1471.07 400.35 1494.54Q479.2 1518 555.2 1518Q639.2 1518 725.68 1496.5Q812.16 1475 885.3 1433Q958.44 1391 1003.42 1328Q1048.4 1265 1048.4 1182Q1048.4 1107 1013.53 1039.13Q978.66 971.27 902.66 918.63Q826.66 866 704.79 835.63Q582.92 805.27 409.92 805.27Z"
          />
          <path
            transform="translate(18337.72 0)"
            d="M661.2 -20Q495.56 -20 369.22 52.5Q242.89 125 171.44 267.5Q100 410 100 620Q100 802 169.59 964.5Q239.18 1127 366.91 1252Q494.65 1377 669.7 1448.5Q844.75 1520 1055.67 1520V1483.27Q919.81 1483.27 814.07 1417.77Q708.33 1352.27 635.98 1241Q563.63 1129.73 525.95 991.29Q488.27 852.86 488.27 706.98L490.32 560.27Q490.32 436.84 499.6 337.28Q508.87 237.72 529.47 166.44Q550.06 95.16 583.73 57.08Q617.41 19 666.47 19Q715.53 19 745.2 53.31Q774.88 87.63 790.2 151.17Q805.52 214.72 810.67 303.01Q815.81 391.31 815.81 500Q815.81 664.74 797.45 756.58Q779.09 848.42 742.81 885.52Q706.53 922.61 654.13 922.61Q598.46 922.61 562.21 887.36Q525.97 852.1 508.14 772.9Q490.32 693.69 490.32 560.27H459.98Q459.98 691.91 479.47 787.64Q498.97 883.37 555.74 935.35Q612.51 987.32 724.48 987.32Q811.46 987.32 896.88 958.72Q982.3 930.12 1052.42 871.16Q1122.54 812.2 1164.6 720.1Q1206.67 628 1206.67 500Q1206.67 350 1139.46 232.5Q1072.24 115 949.54 47.5Q826.84 -20 661.2 -20Z"
          />
          <path
            transform="translate(20016.52 0)"
            d="M678.56 -20Q545.58 -20 435.47 37.67Q325.35 95.34 245.93 199.88Q166.52 304.41 123.26 444.64Q80 584.88 80 750Q80 915.12 125.76 1055.36Q171.52 1195.59 253.3 1300.12Q335.08 1404.66 443.83 1462.33Q552.58 1520 678.56 1520Q804.54 1520 913.29 1462.33Q1022.04 1404.66 1103.82 1300.12Q1185.6 1195.59 1231.36 1055.36Q1277.12 915.12 1277.12 750Q1277.12 584.88 1233.86 444.64Q1190.6 304.41 1111.19 199.88Q1031.77 95.34 921.65 37.67Q811.54 -20 678.56 -20ZM678.56 16.73Q746.62 16.73 785.29 69.35Q823.97 121.97 842.56 219.42Q861.15 316.86 866.3 451.52Q871.44 586.18 871.44 750Q871.44 913.82 865.49 1048.48Q859.54 1183.14 840.55 1280.58Q821.56 1378.03 783.02 1430.65Q744.48 1483.27 678.56 1483.27Q618.5 1483.27 580.83 1430.65Q543.15 1378.03 522.19 1280.58Q501.23 1183.14 493.59 1048.48Q485.95 913.82 485.95 750Q485.95 586.18 491.09 451.52Q496.23 316.86 514.69 219.42Q533.15 121.97 572.33 69.35Q611.5 16.73 678.56 16.73Z"
          />
          <path
            transform="translate(21785.31 658.07) scale(0.5517)"
            d="M570.39 950Q477.61 950 409.75 989.5Q341.9 1029 305.47 1094.5Q269.04 1160 269.04 1238Q269.04 1316 305.47 1381.5Q341.9 1447 409.75 1486.5Q477.61 1526 570.39 1526Q664.18 1526 731.53 1486.5Q798.89 1447 835.32 1381.5Q871.74 1316 871.74 1238Q871.74 1160 835.32 1094.5Q798.89 1029 731.53 989.5Q664.18 950 570.39 950ZM570.39 973.27Q605.38 973.27 626.53 1006.62Q647.69 1039.97 657.59 1100Q667.49 1160.04 667.49 1238Q667.49 1316.96 657.59 1376.5Q647.69 1436.03 626.53 1469.38Q605.38 1502.73 570.39 1502.73Q536.4 1502.73 514.75 1469.38Q493.1 1436.03 483.19 1376.5Q473.29 1316.96 473.29 1238Q473.29 1160.04 483.19 1100Q493.1 1039.97 514.75 1006.62Q536.4 973.27 570.39 973.27Z"
          />
        </g>
      </svg>
    );
  }

  if (variant === 'symbol') {
    return (
      <svg
        viewBox="0 0 256 256"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        {...labelling}
      >
        <defs>
          <linearGradient
            id={`bh-o0-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="127.14"
            y1="46.00"
            x2="199.44"
            y2="87.75"
          >
            <stop offset="0" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#986876" />
          </linearGradient>
          <linearGradient
            id={`bh-o1-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="198.58"
            y1="86.26"
            x2="198.58"
            y2="169.74"
          >
            <stop offset="0" stopColor="#986876" />
            <stop offset="1" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient
            id={`bh-o2-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="199.44"
            y1="168.25"
            x2="127.14"
            y2="210.00"
          >
            <stop offset="0" stopColor="#5B21B6" />
            <stop offset="1" stopColor="#2E43C4" />
          </linearGradient>
          <linearGradient
            id={`bh-o3-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="128.86"
            y1="210.00"
            x2="56.56"
            y2="168.25"
          >
            <stop offset="0" stopColor="#2E43C4" />
            <stop offset="1" stopColor="#0065D2" />
          </linearGradient>
          <linearGradient
            id={`bh-o4-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="57.42"
            y1="169.74"
            x2="57.42"
            y2="86.26"
          >
            <stop offset="0" stopColor="#0065D2" />
            <stop offset="1" stopColor="#6A8A84" />
          </linearGradient>
          <linearGradient
            id={`bh-o5-${uid}`}
            gradientUnits="userSpaceOnUse"
            x1="56.56"
            y1="87.75"
            x2="128.86"
            y2="46.00"
          >
            <stop offset="0" stopColor="#6A8A84" />
            <stop offset="1" stopColor="#D4AF37" />
          </linearGradient>
          <linearGradient id={`bh-bar-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#D4AF37" />
            <stop offset="0.45" stopColor="#D4AF37" stopOpacity="0.15" />
            <stop offset="0.55" stopColor="#D4AF37" stopOpacity="0.15" />
            <stop offset="1" stopColor="#D4AF37" />
          </linearGradient>
          <radialGradient id={`bh-sheen-${uid}`} cx="0.3" cy="0.25" r="0.55">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`bh-core-shade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000000" stopOpacity="0.55" />
            <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <g id={`bh-emblem-${uid}`}>
          <circle
            cx="128.0"
            cy="128.0"
            r="118.12"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="11.77"
            opacity="0.6"
            strokeDasharray="1.44 10.93"
          />
          <g fill="none" strokeWidth="16.0">
            <path stroke={`url(#bh-o0-${uid})`} d="M127.14 46.00 A82.0 82.0 0 0 1 199.44 87.75" />
            <path stroke={`url(#bh-o1-${uid})`} d="M198.58 86.26 A82.0 82.0 0 0 1 198.58 169.74" />
            <path stroke={`url(#bh-o2-${uid})`} d="M199.44 168.25 A82.0 82.0 0 0 1 127.14 210.00" />
            <path stroke={`url(#bh-o3-${uid})`} d="M128.86 210.00 A82.0 82.0 0 0 1 56.56 168.25" />
            <path stroke={`url(#bh-o4-${uid})`} d="M57.42 169.74 A82.0 82.0 0 0 1 57.42 86.26" />
            <path stroke={`url(#bh-o5-${uid})`} d="M56.56 87.75 A82.0 82.0 0 0 1 128.86 46.00" />
          </g>
          <circle cx="128.0" cy="128.0" r="90" fill={`url(#bh-sheen-${uid})`} />
          <circle cx="128.0" cy="128.0" r="74.0" fill="#0B132B" />
          <circle cx="128.0" cy="128.0" r="74.0" fill={`url(#bh-core-shade-${uid})`} />
          <circle cx="128.0" cy="128.0" r="61.5" fill="none" stroke="#D4AF37" strokeWidth="5.0" />
          <rect x="64.0" y="126.5" width="128.0" height="3.0" fill={`url(#bh-bar-${uid})`} />
          <path
            fill="#F8FAFC"
            transform="matrix(0.0740 0 0 -0.0740 104.45 154.20)"
            d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="38 38 180 180"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...labelling}
    >
      <defs>
        <linearGradient
          id={`bh-o0-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="127.14"
          y1="46.00"
          x2="199.44"
          y2="87.75"
        >
          <stop offset="0" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#986876" />
        </linearGradient>
        <linearGradient
          id={`bh-o1-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="198.58"
          y1="86.26"
          x2="198.58"
          y2="169.74"
        >
          <stop offset="0" stopColor="#986876" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient
          id={`bh-o2-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="199.44"
          y1="168.25"
          x2="127.14"
          y2="210.00"
        >
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#2E43C4" />
        </linearGradient>
        <linearGradient
          id={`bh-o3-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="128.86"
          y1="210.00"
          x2="56.56"
          y2="168.25"
        >
          <stop offset="0" stopColor="#2E43C4" />
          <stop offset="1" stopColor="#0065D2" />
        </linearGradient>
        <linearGradient
          id={`bh-o4-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="57.42"
          y1="169.74"
          x2="57.42"
          y2="86.26"
        >
          <stop offset="0" stopColor="#0065D2" />
          <stop offset="1" stopColor="#6A8A84" />
        </linearGradient>
        <linearGradient
          id={`bh-o5-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1="56.56"
          y1="87.75"
          x2="128.86"
          y2="46.00"
        >
          <stop offset="0" stopColor="#6A8A84" />
          <stop offset="1" stopColor="#D4AF37" />
        </linearGradient>
        <linearGradient id={`bh-bar-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D4AF37" />
          <stop offset="0.45" stopColor="#D4AF37" stopOpacity="0.15" />
          <stop offset="0.55" stopColor="#D4AF37" stopOpacity="0.15" />
          <stop offset="1" stopColor="#D4AF37" />
        </linearGradient>
        <radialGradient id={`bh-sheen-${uid}`} cx="0.3" cy="0.25" r="0.55">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`bh-core-shade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="20">
        <path stroke={`url(#bh-o0-${uid})`} d="M127.16 48.00 A80.0 80.0 0 0 1 197.70 88.73" />
        <path stroke={`url(#bh-o1-${uid})`} d="M196.86 87.28 A80.0 80.0 0 0 1 196.86 168.72" />
        <path stroke={`url(#bh-o2-${uid})`} d="M197.70 167.27 A80.0 80.0 0 0 1 127.16 208.00" />
        <path stroke={`url(#bh-o3-${uid})`} d="M128.84 208.00 A80.0 80.0 0 0 1 58.30 167.27" />
        <path stroke={`url(#bh-o4-${uid})`} d="M59.14 168.72 A80.0 80.0 0 0 1 59.14 87.28" />
        <path stroke={`url(#bh-o5-${uid})`} d="M58.30 88.73 A80.0 80.0 0 0 1 128.84 48.00" />
      </g>
      <circle cx="128.0" cy="128.0" r="90" fill={`url(#bh-sheen-${uid})`} />
      <circle cx="128.0" cy="128.0" r="70" fill="#0B132B" />
      <circle cx="128.0" cy="128.0" r="70" fill={`url(#bh-core-shade-${uid})`} />
      <circle cx="128.0" cy="128.0" r="59" fill="none" stroke="#D4AF37" strokeWidth="6" />
      <rect x="66.0" y="126.3" width="124" height="3.4" fill={`url(#bh-bar-${uid})`} />
      <path
        fill="#F8FAFC"
        transform="matrix(0.0858 0 0 -0.0858 100.68 158.39)"
        d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
      />
    </svg>
  );
}

/**
 * Assinatura da marca para barras e cabeçalhos: emblema + nome como TEXTO.
 *
 * Não é o mesmo que `variant="horizontal"`. Aquele é o arquivo-mestre, com o
 * logotipo vetorizado — a altura útil de uma topbar (~28px) reduz o logotipo a
 * ~6px de corpo, ilegível. Aqui o emblema entra na variante de ícone (que o
 * brand book autoriza a partir de 32px) e o nome volta a ser texto real:
 * legível, selecionável e lido por leitor de tela.
 *
 * Use `variant="horizontal"` onde a marca tem espaço de verdade — capa de
 * documento, e-mail, apresentação, tela de abertura.
 */
export function BirthHubSignature({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <BirthHubLogo variant="icon" className="h-full w-auto shrink-0" />
      <BirthHubWordmark className="text-[0.95em] leading-none whitespace-nowrap" />
    </span>
  );
}

/**
 * Logotipo em texto — o nome da plataforma. Existe separado do SVG porque o nome
 * precisa ser texto REAL onde é conteúdo: título de página, cabeçalho de login,
 * resultado de busca, leitor de tela.
 *
 * A rampa metálica do brand book
 * (`linear-gradient(180deg,#F7E9B8,#D4AF37,#8C6D1F,#EBD689)` recortada no texto)
 * só entra no tema ESCURO. No claro ela é ilegível: o topo das letras é
 * #F7E9B8, que mede ~1.1:1 contra a superfície clara — muito abaixo do mínimo
 * de 3:1 para texto grande. O tema claro usa Obsidian sólido, que é o que o
 * próprio brand book manda ("ANCHOR — base sempre Obsidian ou Snow White") e
 * mede 18:1.
 */
export function BirthHubWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-display font-bold tracking-[0.18em] text-ink dark:bg-[linear-gradient(180deg,#F7E9B8_0%,#D4AF37_42%,#8C6D1F_68%,#EBD689_100%)] dark:bg-clip-text dark:text-transparent ${className ?? ''}`}
    >
      {BRAND.name}
    </span>
  );
}
