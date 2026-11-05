import KitIcon from '~/components/KitIcon';
import { parseKitColors } from '~/engine/LiveTracker';

export function meta() {
  return [{ title: '球衣图标预览' }];
}

interface Sample {
  name: string;
  note?: string;
  tc: string;
  kc: string;
  ki?: string;
}

// 第一组来自 public/data/match_full.json 的真实快照；
// 其余为用户提供的对方平台样本与真实球衣对照。
const SAMPLES: Sample[] = [
  {
    name: 'Flamengo',
    note: 'match_full.json 真实数据（红黑）',
    tc: '#C40010',
    kc: '#D6003D,#0A0A0A,#F0F0F0,#C40010,#5C8FAE,#FFDF1B,#0A0A0A,#0A0A0A,#F0F0F0,#0A0A0A,#F0F0F0',
  },
  {
    name: 'Estudiantes',
    note: 'match_full.json 真实数据（白底）',
    tc: '#F0F0F0',
    kc: '#F0F0F0,#F0F0F0,#F0F0F0,#F0F0F0,#F0F0F0,#0046A8,#0A0A0A,#C40010,#0A0A0A,#D6003D,#C40010',
  },
  {
    name: 'FCSB',
    note: '对方平台图标：蓝底白袖红边',
    tc: '#0046A8',
    kc: '#F0F0F0,#0046A8,#0046A8,#0046A8,#C40010,#0046A8,#0046A8,#F0F0F0,#0046A8,#0046A8,#F0F0F0',
  },
  {
    name: '红白客队',
    note: '对方平台图标：红底白领',
    tc: '#FF0000',
    kc: '#FF0000,#FF0000,#FF0000,#FF0000,#FF0000,#0000FF,#3D4A4E,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF',
  },
  {
    name: 'Arsenal',
    note: '真实球衣：红底白袖白领',
    tc: '#C40010',
    kc: '#F0F0F0,#C40010,#C40010,#C40010,#999999,#888888,#F0F0F0,#F0F0F0,#F0F0F0,#C40010,#F0F0F0',
  },
  {
    name: 'Leeds United',
    note: '真实球衣：白底蓝黄细纹',
    tc: '#F0F0F0',
    kc: '#0046A8,#0046A8,#0046A8,#0A0A0A,#C40010,#0046A8,#C0D6FE,#FBED32,#FBED32,#679FEA,#0A0A0A',
  },
  {
    name: '蓝红半色主队',
    note: '对方平台图标：左蓝右红，KI=13',
    tc: '#0046A8',
    kc: '#0046A8,#0046A8,#C40010,#C40010,#C40010,#0046A8,#0046A8,#0046A8,#0A0A0A,#0A0A0A,#C40010',
    ki: '13',
  },
  {
    name: '橙色客队',
    note: '对方平台图标：纯橙，KI=16',
    tc: '#EA8015',
    kc: '#EA8015,#EA8015,#D446BA,#00C1BA,#C40010,#0046A8,#0A0A0A,#EA8015,#0A0A0A,#0A0A0A,#EA8015',
    ki: '16',
  },
];

export default function KitPreview() {
  return (
    <div
      style={{
        minHeight: '100%',
        padding: '32px clamp(16px, 4vw, 48px)',
        background: '#12151c',
        color: '#e8ecf4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>球衣图标：TC + KC 多色版</h1>
      <p style={{ margin: '0 0 28px', color: '#8b93a7', fontSize: 13 }}>
        主体 = TC，领口 = KC[0]，条纹 = KC[1]，辅色（袖子）= KC[7]；KI=13 渲染左右半色；右侧为旧版单色对照。
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}
      >
        {SAMPLES.map((s) => {
          const kit = parseKitColors(s.kc, s.tc, s.ki);
          return (
            <div
              key={s.name}
              style={{
                border: '1px solid #262c3a',
                borderRadius: 12,
                padding: '16px 18px',
                background: '#181c26',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#8b93a7', marginTop: 2 }}>{s.note}</div>
                </div>
                <code style={{ fontSize: 10, color: '#5f6880' }}>
                  TC {kit.body}
                  {kit.design ? ` · KI ${kit.design}` : ''}
                </code>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 28,
                  margin: '18px 0 16px',
                }}
              >
                <figure style={{ margin: 0, textAlign: 'center' }}>
                  <KitIcon kit={kit} color={s.tc} className="preview-kit-large" />
                  <figcaption style={{ fontSize: 11, color: '#8b93a7', marginTop: 6 }}>新版</figcaption>
                </figure>
                <figure style={{ margin: 0, textAlign: 'center' }}>
                  <KitIcon color={s.tc} className="preview-kit-large" />
                  <figcaption style={{ fontSize: 11, color: '#8b93a7', marginTop: 6 }}>旧版</figcaption>
                </figure>
                <figure style={{ margin: 0, textAlign: 'center' }}>
                  <KitIcon kit={kit} color={s.tc} className="preview-kit-small" />
                  <figcaption style={{ fontSize: 11, color: '#8b93a7', marginTop: 6 }}>记分牌尺寸</figcaption>
                </figure>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  ['主体', kit.body],
                  ['领口 KC0', kit.collar],
                  ['条纹 KC1', kit.pattern],
                  ['装饰 KC4', kit.accent],
                  ['辅色 KC7', kit.secondary],
                ].map(([label, hex]) => (
                  <span
                    key={label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: '#11141b',
                      border: '1px solid #2a3140',
                      fontSize: 11,
                      color: '#b9c1d4',
                    }}
                  >
                    <i
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: hex,
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
                      }}
                    />
                    {label} {hex}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .preview-kit-large { width: 84px; height: 84px; }
        .preview-kit-small { width: 26px; height: 26px; }
      `}</style>
    </div>
  );
}
