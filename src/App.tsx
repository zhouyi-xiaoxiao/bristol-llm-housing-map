import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applicationLinks,
  appleMapsUrl,
  categories,
  destination,
  googleMapsUrl,
  listings,
  sourceAudit,
  type CategoryId,
  type Listing,
  verificationLinks,
} from "./data";
import { MapView } from "./MapView";

type Filter = CategoryId | "all";
type QuickFilter = "all" | "top" | "budget" | "oneBed" | "bills" | "borderline";

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "top", label: "Top picks" },
  { id: "budget", label: "预算友好" },
  { id: "oneBed", label: "1B1B" },
  { id: "bills", label: "全包" },
  { id: "borderline", label: "边界备选" },
];

function stars(priority: Listing["priority"]) {
  return Array.from({ length: 5 }, (_, index) => (
    <span key={index} className={index < priority ? "dot dotOn" : "dot"} />
  ));
}

function matchesQuickFilter(listing: Listing, filter: QuickFilter) {
  if (filter === "all") return true;
  if (filter === "top") return Boolean(listing.topPick);
  if (filter === "borderline") return Boolean(listing.borderline);
  if (filter === "budget") {
    return listing.tags.some((tag) => tag.includes("预算") || tag.includes("低价") || tag.includes("便宜"));
  }
  if (filter === "oneBed") {
    return /1-bed|1B1B|1-bed flat|one-bedroom/i.test(
      `${listing.name} ${listing.type} ${listing.tags.join(" ")}`,
    );
  }
  if (filter === "bills") {
    return /全包|all bills|bills|included/i.test(
      `${listing.price} ${listing.note} ${listing.tags.join(" ")}`,
    );
  }
  return true;
}

function sourceStatusLabel(listing: Listing) {
  if (listing.sourceStatus === "verified") return "官方确认";
  if (listing.sourceStatus === "provider") return "Provider";
  if (listing.sourceStatus === "search") return "搜索页";
  return "实时波动";
}

function ListingCard({
  listing,
  active,
  number,
  onSelect,
  cardRef,
}: {
  listing: Listing;
  active: boolean;
  number: number;
  onSelect: (id: string, options?: { scroll?: boolean }) => void;
  cardRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <article
      ref={cardRef}
      id={`listing-${listing.id}`}
      className={`listingCard ${active ? "activeCard" : ""} ${listing.borderline ? "borderlineCard" : ""}`}
    >
      <div className="cardHeader">
        <div>
          <p className="kicker">
            {number.toString().padStart(2, "0")} · {categories[listing.category].short}
          </p>
          <h3>{listing.name}</h3>
        </div>
        <div className="rating" aria-label={`${listing.priority} out of 5 priority`}>
          {stars(listing.priority)}
        </div>
      </div>
      <dl className="facts">
        <div>
          <dt>类型</dt>
          <dd>{listing.type}</dd>
        </div>
        <div>
          <dt>位置</dt>
          <dd>{listing.area}</dd>
        </div>
        <div>
          <dt>步行</dt>
          <dd>{listing.walk}</dd>
        </div>
        <div>
          <dt>价格</dt>
          <dd>{listing.price}</dd>
        </div>
      </dl>
      <p className="judgment">{listing.note}</p>
      <div className="tagRow">
        <span>{sourceStatusLabel(listing)}</span>
        {listing.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
        {listing.verifyLive && <span className="warnTag">签约前实时确认</span>}
        {listing.borderline && <span className="warnTag">超过/接近 20 分钟</span>}
      </div>
      <div className="linkRow">
        <button type="button" onClick={() => onSelect(listing.id, { scroll: false })}>
          定位地图
        </button>
        <a href={appleMapsUrl(listing.origin)} target="_blank" rel="noreferrer">
          Apple Maps
        </a>
        <a href={googleMapsUrl(listing.origin)} target="_blank" rel="noreferrer">
          Google backup
        </a>
        <a href={listing.sourceUrl} target="_blank" rel="noreferrer">
          {listing.sourceLabel}
        </a>
      </div>
    </article>
  );
}

function SelectedSummary({
  selected,
  selectedNumber,
}: {
  selected?: Listing;
  selectedNumber: number;
}) {
  if (!selected) {
    return (
      <aside className="mapAside">
        <p className="kicker">Selected</p>
        <h3>选择一个地图点</h3>
        <p>点击地图上的编号 marker，右侧会显示路线、价格、来源和判断。</p>
      </aside>
    );
  }

  return (
    <aside className="mapAside">
      <p className="kicker">
        Selected · {selectedNumber.toString().padStart(2, "0")} · {categories[selected.category].short}
      </p>
      <h3>{selected.name}</h3>
      <p>{selected.note}</p>
      <div className="miniFacts">
        <span>{selected.walk}</span>
        <span>{selected.price}</span>
        <span>{sourceStatusLabel(selected)}</span>
      </div>
      <div className="linkRow stackedLinks">
        <a href={appleMapsUrl(selected.origin)} target="_blank" rel="noreferrer">
          Apple Maps 步行路线
        </a>
        <a href={googleMapsUrl(selected.origin)} target="_blank" rel="noreferrer">
          Google Maps 备用
        </a>
        <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
          来源页面
        </a>
      </div>
    </aside>
  );
}

function MobileSummaryStrip({
  listings,
  selectedId,
  onSelect,
}: {
  listings: Listing[];
  selectedId: string;
  onSelect: (id: string, options?: { scroll?: boolean }) => void;
}) {
  const ordered = useMemo(() => {
    const selected = listings.find((listing) => listing.id === selectedId);
    const rest = listings.filter((listing) => listing.id !== selectedId);
    return selected ? [selected, ...rest] : rest;
  }, [listings, selectedId]);

  return (
    <div className="mobileSummaryStrip" aria-label="Visible map listings">
      {ordered.map((listing) => {
        const index = listings.findIndex((item) => item.id === listing.id) + 1;
        return (
          <article
            className={`mobileSummaryCard ${listing.id === selectedId ? "activeMobileSummary" : ""}`}
            key={listing.id}
            onClick={() => onSelect(listing.id, { scroll: false })}
          >
            <p className="kicker">
              {index.toString().padStart(2, "0")} · {categories[listing.category].short}
            </p>
            <h3>{listing.name}</h3>
            <p>{listing.walk} · {listing.price}</p>
            <div className="summaryLinks">
              <a href={appleMapsUrl(listing.origin)} target="_blank" rel="noreferrer">
                Apple
              </a>
              <a href={googleMapsUrl(listing.origin)} target="_blank" rel="noreferrer">
                Google
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SourceAudit() {
  return (
    <section className="auditBand" id="source-audit">
      <div className="sectionLead">
        <p className="kicker">Source audit</p>
        <h2>已遍历来源</h2>
        <p>
          这里记录纳入、边界保留和排除原因。大学官方和 PBSA provider 信息相对稳定；普通社会房源只作为实时搜索线索。
        </p>
      </div>
      <div className="auditGrid">
        {sourceAudit.map((audit) => (
          <article className="auditCard" key={audit.group}>
            <h3>{audit.group}</h3>
            <p className="auditLabel">Included</p>
            <p>{audit.included.join(" · ")}</p>
            {audit.borderline.length > 0 && (
              <>
                <p className="auditLabel">Borderline</p>
                <p>{audit.borderline.join(" · ")}</p>
              </>
            )}
            <p className="auditLabel">Excluded</p>
            <ul>
              {audit.excluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApplicationGuide() {
  return (
    <section className="applicationBand" id="apply">
      <div className="sectionLead">
        <p className="kicker">Official application</p>
        <h2>大学官方住宿怎么申请</h2>
        <p>
          给 single / unaccompanied LLM：官方住宿不是直接在每个 residence 页面单独下单，而是先接受 Bristol
          study offer，拿 student number，再进 Accommodation Portal 填申请和偏好。
        </p>
      </div>

      <div className="applicationGrid">
        <article className="applicationCard primaryApplyCard">
          <p className="kicker">Single applicant route</p>
          <h3>先走 Accommodation Portal</h3>
          <ol>
            <li>接受 University of Bristol 的课程 offer；PG 申请者通常要先 firm/accept study offer。</li>
            <li>等学生号生效，官方说可能需要最多 3 天后才能申请住宿。</li>
            <li>用 student number 和申请大学时的同一邮箱注册 Accommodation Portal。</li>
            <li>在 portal 里填预算、room type、flat type、location、top three residences 等偏好。</li>
            <li>收到 accommodation offer 后，仍在 portal 里签 tenancy agreement；PG 可能还要付部分 advance rent。</li>
          </ol>
        </article>

        <article className="applicationCard deadlineCard">
          <p className="kicker">2026 entry dates</p>
          <h3>关键日期</h3>
          <dl className="deadlineFacts">
            <div>
              <dt>开放申请</dt>
              <dd>8 April 2026</dd>
            </div>
            <div>
              <dt>Guarantee deadline</dt>
              <dd>30 June 2026</dd>
            </div>
            <div>
              <dt>PG response</dt>
              <dd>30 June 前申请：通常 within two weeks</dd>
            </div>
          </dl>
          <p>
            官方 guarantee 对 overseas-fee、first-year、new full-time postgraduate、unaccompanied
            申请者更友好；如果是 single 状态，不要把 family/couples accommodation 当作主要方案。
          </p>
        </article>
      </div>

      <div className="applicationLinks">
        {applicationLinks.map((link) => (
          <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
            <strong>{link.label}</strong>
            <span>{link.note}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [category, setCategory] = useState<Filter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedId, setSelectedId] = useState("college-house");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const visibleListings = useMemo(() => {
    return listings.filter((listing) => {
      const categoryMatch = category === "all" || listing.category === category;
      return categoryMatch && matchesQuickFilter(listing, quickFilter);
    });
  }, [category, quickFilter]);

  const topPicks = listings.filter((listing) => listing.topPick);
  const mainListings = visibleListings.filter((listing) => !listing.borderline);
  const borderlineListings = visibleListings.filter((listing) => listing.borderline);
  const selected = listings.find((item) => item.id === selectedId);
  const selectedNumber = Math.max(
    1,
    visibleListings.findIndex((listing) => listing.id === selectedId) + 1,
  );

  const selectListing = useCallback(
    (id: string, options?: { scroll?: boolean }) => {
      setSelectedId(id);
      if (options?.scroll) {
        window.setTimeout(() => {
          cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 20);
      }
    },
    [],
  );

  useEffect(() => {
    if (visibleListings.length > 0 && !visibleListings.some((listing) => listing.id === selectedId)) {
      setSelectedId(visibleListings[0].id);
    }
  }, [selectedId, visibleListings]);

  return (
    <main>
      <header className="hero">
        <nav className="topNav" aria-label="Site navigation">
          <a className="brandMark" href="#top" aria-label="Bristol LLM Housing Map home">
            周易潇潇
            <span>zhouyixiaoxiao</span>
          </a>
          <div className="socials">视频号 · 小红书 · LinkedIn</div>
        </nav>

        <section className="heroGrid" id="top">
          <div className="heroCopy">
            <p className="kicker">Bristol LLM Housing Edit / Last checked 27 April 2026</p>
            <h1>
              Bristol
              <em> LLM housing</em>
              <span> within 20 minutes</span>
            </h1>
            <p className="intro">
              面向中国 international LLM 的 Studio + 1B1B / one-bedroom flat 筛选。以上课点
              University of Bristol Law School / Wills Memorial Building 为中心，主列表保留步行约 20
              分钟以内，略远但有参考价值的放入边界备选。
            </p>
            <div className="heroActions">
              <a href="#map">看地图</a>
              <a href="#listings">看全部房源</a>
              <a href="#apply">官方申请入口</a>
              <a href="#source-audit">看来源审计</a>
            </div>
          </div>
          <div className="heroPlate" aria-label="Quick recommendation">
            <p className="plateNumber">{topPicks.length.toString().padStart(2, "0")}</p>
            <p className="kicker">Most recommended</p>
            <ol>
              {topPicks.map((listing) => (
                <li key={listing.id}>
                  <button type="button" onClick={() => selectListing(listing.id, { scroll: true })}>
                    {listing.name}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </header>

      <section className="filterBand" aria-label="Listing filters">
        <div className="filterScroller">
          <div className="filterGroup" aria-label="Category filters">
            <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>
              全部
            </button>
            {Object.entries(categories).map(([id, item]) => (
              <button
                key={id}
                className={category === id ? "active" : ""}
                onClick={() => setCategory(id as CategoryId)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filterScroller">
          <div className="filterGroup compact" aria-label="Quick filters">
            {quickFilters.map((item) => (
              <button
                key={item.id}
                className={quickFilter === item.id ? "active" : ""}
                onClick={() => setQuickFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mapBand" id="map">
        <div className="sectionLead">
          <p className="kicker">Interactive map · {visibleListings.length} visible</p>
          <h2>现在是能用的地图</h2>
          <p>
            地图支持拖拽、滚轮/按钮缩放、点击编号 marker。默认加载真实街道底图；如果国内网络无法取到瓦片，本地兜底底图和全部点位仍然显示。
          </p>
        </div>
        <div className="schoolNotice">
          <strong>黑色 W = Wills Memorial Building / Law School，上课中心点</strong>
          <span>
            这个范围是你大概率上课和日常去学校的区域：Queens Road 的 Wills Memorial Building
            是法学院和很多教学活动的锚点，周边 Clifton Triangle、Park Street、College Green、City Centre
            是步行找房最该看的圈。
          </span>
          <a href={destination.sourceUrl} target="_blank" rel="noreferrer">
            University official address
          </a>
        </div>
        <div className="mapShell">
          <div className="mapArea">
            <MapView listings={visibleListings} selectedId={selectedId} onSelect={selectListing} />
            <MobileSummaryStrip listings={visibleListings} selectedId={selectedId} onSelect={selectListing} />
          </div>
          <SelectedSummary selected={selected} selectedNumber={selectedNumber} />
        </div>
      </section>

      <ApplicationGuide />

      <section className="listingBand" id="listings">
        <div className="sectionLead">
          <p className="kicker">
            {mainListings.length} main · {borderlineListings.length} borderline
          </p>
          <h2>所有候选房源</h2>
          <p>
            私营学生公寓和社会房源价格、房态变化很快；页面用来做第一轮筛选，签约前以官网、邮件回复和合同为准。
          </p>
        </div>

        <div className="listingGrid">
          {mainListings.map((listing) => (
            <ListingCard
              key={listing.id}
              number={visibleListings.findIndex((item) => item.id === listing.id) + 1}
              listing={listing}
              active={selectedId === listing.id}
              onSelect={selectListing}
              cardRef={(node) => {
                cardRefs.current[listing.id] = node;
              }}
            />
          ))}
        </div>

        {borderlineListings.length > 0 && (
          <>
            <div className="sectionLead borderlineLead">
              <p className="kicker">Borderline / 可备选</p>
              <h2>略远但值得知道</h2>
              <p>这些项目通常超过或接近 20 分钟，保留是为了完整比较；如果每天去 Wills 上课，不建议作为第一选择。</p>
            </div>
            <div className="listingGrid">
              {borderlineListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  number={visibleListings.findIndex((item) => item.id === listing.id) + 1}
                  listing={listing}
                  active={selectedId === listing.id}
                  onSelect={selectListing}
                  cardRef={(node) => {
                    cardRefs.current[listing.id] = node;
                  }}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="tableBand">
        <div className="sectionLead">
          <p className="kicker">Compact view</p>
          <h2>快速对比表</h2>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>房源</th>
                <th>类别</th>
                <th>步行</th>
                <th>价格</th>
                <th>状态</th>
                <th>路线</th>
              </tr>
            </thead>
            <tbody>
              {visibleListings.map((listing, index) => (
                <tr key={listing.id}>
                  <td>{index + 1}</td>
                  <td>{listing.name}</td>
                  <td>{categories[listing.category].label}</td>
                  <td>{listing.walk}</td>
                  <td>{listing.price}</td>
                  <td>{listing.borderline ? "边界" : sourceStatusLabel(listing)}</td>
                  <td>
                    <a href={appleMapsUrl(listing.origin)} target="_blank" rel="noreferrer">
                      Apple
                    </a>
                    <span> / </span>
                    <a href={googleMapsUrl(listing.origin)} target="_blank" rel="noreferrer">
                      Google
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SourceAudit />

      <section className="adviceBand">
        <div>
          <p className="kicker">International student checks</p>
          <h2>发邮件/签约前必问</h2>
        </div>
        <ul className="questionList">
          <li>Do you accept international students without a UK guarantor?</li>
          <li>Can I use a guarantor service, or is upfront rent required?</li>
          <li>Are all bills included, including broadband and contents insurance?</li>
          <li>Is the deposit protected in a tenancy deposit scheme?</li>
          <li>What is the break clause, and what happens if visa/course plans change?</li>
        </ul>
      </section>

      <footer>
        <div>
          <strong>周易潇潇 / zhouyixiaoxiao</strong>
          <p>视频号 · 小红书 · LinkedIn</p>
        </div>
        <div className="sourceLinks">
          {verificationLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </main>
  );
}
