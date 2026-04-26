import { useMemo, useRef, useState } from "react";
import {
  appleMapsUrl,
  categories,
  destination,
  googleMapsUrl,
  listings,
  type CategoryId,
  type Listing,
  verificationLinks,
} from "./data";

type Filter = CategoryId | "all";
type QuickFilter = "all" | "top" | "budget" | "oneBed" | "bills";

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "top", label: "Top picks" },
  { id: "budget", label: "预算友好" },
  { id: "oneBed", label: "1B1B" },
  { id: "bills", label: "全包" },
];

function stars(priority: Listing["priority"]) {
  return Array.from({ length: 5 }, (_, index) => (
    <span key={index} className={index < priority ? "dot dotOn" : "dot"} />
  ));
}

function matchesQuickFilter(listing: Listing, filter: QuickFilter) {
  if (filter === "all") return true;
  if (filter === "top") return Boolean(listing.topPick);
  if (filter === "budget") {
    return listing.tags.some((tag) => tag.includes("预算") || tag.includes("低价"));
  }
  if (filter === "oneBed") {
    return /1-bed|1B1B|1-bed flat/i.test(`${listing.name} ${listing.type} ${listing.tags.join(" ")}`);
  }
  if (filter === "bills") {
    return /全包|all bills|bills|included/i.test(
      `${listing.price} ${listing.note} ${listing.tags.join(" ")}`,
    );
  }
  return true;
}

function ListingCard({
  listing,
  active,
  onSelect,
  cardRef,
}: {
  listing: Listing;
  active: boolean;
  onSelect: (id: string) => void;
  cardRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <article
      ref={cardRef}
      id={`listing-${listing.id}`}
      className={`listingCard ${active ? "activeCard" : ""}`}
      onMouseEnter={() => onSelect(listing.id)}
    >
      <div className="cardHeader">
        <div>
          <p className="kicker">{categories[listing.category].short}</p>
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
        {listing.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
        {listing.verifyLive && <span className="warnTag">签约前实时确认</span>}
      </div>
      <div className="linkRow">
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

function MapPanel({
  visibleListings,
  selectedId,
  onSelect,
}: {
  visibleListings: Listing[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = listings.find((item) => item.id === selectedId);

  return (
    <section className="mapBand" id="map">
      <div className="sectionLead">
        <p className="kicker">China-friendly map layer</p>
        <h2>地图先能看，再跳转导航</h2>
        <p>
          红点是公寓，黑色方标是 Wills / Law School。内嵌地图完全本地绘制，不加载 Google
          地图；路线默认打开 Apple Maps，Google Maps 作为备用链接。
        </p>
      </div>

      <div className="mapShell">
        <div className="mapCanvas" aria-label="Stylized Bristol accommodation map">
          <svg viewBox="0 0 100 100" role="img" aria-labelledby="mapTitle mapDesc">
            <title id="mapTitle">Bristol housing map around Wills Memorial Building</title>
            <desc id="mapDesc">
              A stylized map showing Bristol city centre, Clifton, the harbour and accommodation pins.
            </desc>
            <rect width="100" height="100" rx="0" className="mapBg" />
            <path
              className="river"
              d="M0 72 C16 64 27 76 41 70 C54 64 60 75 74 70 C87 66 93 58 100 61 L100 100 L0 100 Z"
            />
            <path className="park" d="M7 13 L27 6 L37 18 L25 31 L9 28 Z" />
            <path className="park second" d="M73 9 L94 15 L90 31 L70 28 Z" />
            <path className="road major" d="M15 88 C29 72 34 57 41 41 C49 24 62 16 83 8" />
            <path className="road" d="M7 48 C25 44 41 41 60 39 C75 38 86 35 96 30" />
            <path className="road" d="M18 22 C31 34 47 48 67 63 C78 72 90 78 98 82" />
            <path className="road" d="M26 68 C36 55 49 50 63 50 C78 50 88 44 96 38" />
            <text x="12" y="11" className="mapLabel">
              Whiteladies / Clifton
            </text>
            <text x="57" y="32" className="mapLabel">
              City Centre
            </text>
            <text x="53" y="85" className="mapLabel">
              Harbourside
            </text>

            <g className="schoolMarker" transform={`translate(${destination.map.x} ${destination.map.y})`}>
              <rect x="-3.6" y="-3.6" width="7.2" height="7.2" rx="1" />
              <path d="M-6 0 L6 0 M0 -6 L0 6" />
            </g>
            <text x={destination.map.x + 4.5} y={destination.map.y - 5} className="schoolLabel">
              Wills / Law
            </text>

            {visibleListings.map((listing) => (
              <g
                key={listing.id}
                className={`pinButton ${selectedId === listing.id ? "selectedPin" : ""}`}
                transform={`translate(${listing.map.x} ${listing.map.y})`}
                onClick={() => onSelect(listing.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(listing.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select ${listing.name}`}
              >
                <path d="M0 -5.4 C3.2 -5.4 5.4 -3.2 5.4 0 C5.4 4 0 8.8 0 8.8 C0 8.8 -5.4 4 -5.4 0 C-5.4 -3.2 -3.2 -5.4 0 -5.4Z" />
                <circle r="1.8" />
              </g>
            ))}
          </svg>
        </div>

        <aside className="mapAside">
          <p className="kicker">Selected</p>
          <h3>{selected?.name ?? "选择一个红点"}</h3>
          {selected ? (
            <>
              <p>{selected.note}</p>
              <div className="miniFacts">
                <span>{selected.walk}</span>
                <span>{selected.price}</span>
              </div>
              <div className="linkRow stackedLinks">
                <a href={appleMapsUrl(selected.origin)} target="_blank" rel="noreferrer">
                  Apple Maps 步行路线
                </a>
                <a href={googleMapsUrl(selected.origin)} target="_blank" rel="noreferrer">
                  Google Maps 备用
                </a>
              </div>
            </>
          ) : (
            <p>点击地图上的红点，右侧会显示路线和判断。</p>
          )}
        </aside>
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

  function selectAndScroll(id: string) {
    setSelectedId(id);
    window.setTimeout(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 20);
  }

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
            <p className="kicker">Bristol LLM Housing Edit / Last checked 26 April 2026</p>
            <h1>
              Bristol
              <em> LLM housing</em>
              <span> within 20 minutes</span>
            </h1>
            <p className="intro">
              面向中国 international LLM 的 Studio + 1B1B / one-bedroom flat 筛选。以上课点
              University of Bristol Law School / Wills Memorial Building 为中心，只保留步行约 20
              分钟以内、值得认真看的选项。
            </p>
            <div className="heroActions">
              <a href="#map">看地图</a>
              <a href="#listings">看全部房源</a>
            </div>
          </div>
          <div className="heroPlate" aria-label="Quick recommendation">
            <p className="plateNumber">05</p>
            <p className="kicker">Most recommended</p>
            <ol>
              {topPicks.map((listing) => (
                <li key={listing.id}>
                  <button type="button" onClick={() => selectAndScroll(listing.id)}>
                    {listing.name}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </header>

      <section className="filterBand">
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
      </section>

      <MapPanel
        visibleListings={visibleListings}
        selectedId={selectedId}
        onSelect={(id) => {
          selectAndScroll(id);
        }}
      />

      <section className="listingBand" id="listings">
        <div className="sectionLead">
          <p className="kicker">{visibleListings.length} listings visible</p>
          <h2>所有候选房源</h2>
          <p>
            私营学生公寓和社会房源价格、房态变化很快；页面用来做第一轮筛选，签约前以官网、邮件回复和合同为准。
          </p>
        </div>

        <div className="listingGrid">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              active={selectedId === listing.id}
              onSelect={setSelectedId}
              cardRef={(node) => {
                cardRefs.current[listing.id] = node;
              }}
            />
          ))}
        </div>
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
                <th>房源</th>
                <th>类别</th>
                <th>步行</th>
                <th>价格</th>
                <th>路线</th>
              </tr>
            </thead>
            <tbody>
              {visibleListings.map((listing) => (
                <tr key={listing.id}>
                  <td>{listing.name}</td>
                  <td>{categories[listing.category].label}</td>
                  <td>{listing.walk}</td>
                  <td>{listing.price}</td>
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
