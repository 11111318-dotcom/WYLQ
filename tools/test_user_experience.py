#!/usr/bin/env python3
"""Regression checks for WYLQ's beginner/professional information architecture."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from html.parser import HTMLParser

source = Path(sys.argv[1] if len(sys.argv) > 1 else "index.html")
if not source.is_file():
    raise SystemExit(f"FAIL HTML file not found: {source}")
html = source.read_text(encoding="utf-8")

class ResultSectionCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if "id" in values and "section" in (values.get("class") or "").split():
            self.ids.append(values["id"] or "")


def require(ok: bool, message: str) -> None:
    print(("PASS " if ok else "FAIL ") + message)
    if not ok:
        raise SystemExit(1)

start = html.find("const RESULT_TAB_DEFS=[")
end = html.find("\nfunction initializeYipianAdvancedSettings()", start)
require(start >= 0 and end > start, "result perspective definitions are present")
defs = html[start:end]
pattern = re.compile(
    r"\{id:'([^']+)',advanced:(true|false),[\s\S]*?sections:\[([^\]]*)\]",
    re.MULTILINE,
)
rows = pattern.findall(defs)
require(len(rows) == 10, "exactly ten task-oriented result views are defined")
ids = [row[0] for row in rows]
require(ids[:3] == ["overview", "constitution", "care"], "first three views are beginner task views in the intended order")
require(all(row[1] == "false" for row in rows[:3]), "beginner views are available without enabling professional mode")
require(all(row[1] == "true" for row in rows[3:]), "specialist views are marked professional-only")
require(len(ids) == len(set(ids)), "result view identifiers are unique")

section_map: dict[str, str] = {}
for tab_id, _advanced, section_text in rows:
    for section_id in re.findall(r"'([A-Za-z][A-Za-z0-9]+)'", section_text):
        if section_id in section_map:
            raise SystemExit(f"FAIL section {section_id} appears in both {section_map[section_id]} and {tab_id}")
        section_map[section_id] = tab_id

expected_sections = {
    "interactionSection", "sixStepFortuneSection", "repairWindowSection", "yearTimelineSection",
    "birthSection", "constitutionSection", "clinicalCautionSection", "herbDirectionSection",
    "sixSection", "targetSection", "liuYuanTargetSection", "shengFuYuFaSection",
    "liuYuanExpandedSection", "kangHaiSection", "houQiGeoSection", "chronicleSection",
    "daSiTianSection", "hostYunSection", "fetalYunSection", "tenGanConstitutionSection",
    "constitutionTypeSection", "pattern9Section", "specialDualPathologySection",
    "ninePalaceSection", "observationSection", "dayHourYunSection", "southNorthSection",
    "pulseSixStepSection", "pulseBenMaiSection", "renYingPulseSection", "herbsSection",
    "xuanzhuSixSoupsSection", "classicProfilesSection", "matrix30Section",
    "pingQiMatrixSection", "wuyun15JiSection", "yipianSection", "auditSection",
    "dualTrackGuideSection",
}
require(expected_sections.issubset(section_map), "all established result modules remain assigned to a view")
collector = ResultSectionCollector()
collector.feed(html)
static_section_ids = set(collector.ids)
require(static_section_ids.issubset(section_map), "all static result sections are assigned to a user view")
require(len(collector.ids) == len(static_section_ids), "static result section identifiers are unique")
require("function setProfessionalMode(enabled,announce=true)" in html, "professional mode has a single state controller")
require("if(def.advanced&&!window.__wylqProfessionalMode" in html, "direct links to specialist views reveal the required tabs")
require("setProfessionalMode(false,false)" in html, "a new personalized calculation resets to beginner mode")
require("function initializeWylqGlossary()" in html and "function renderWylqGlossary(query)" in html, "searchable glossary is initialized and rendered")
require(len(re.findall(r"\{term:'", html[html.find("const WYLQ_GLOSSARY="):html.find("function renderWylqGlossary")])) >= 20,
        "glossary includes at least twenty common terms")
require('id="resultModeControl"' in html and 'id="professionalModeToggle"' in html, "mode switch is present in the result page")
require('id="termGlossarySearch"' in html and 'id="termGlossaryResults"' in html, "glossary search controls are present")
require('class="result-disclaimer-details"' in html and 'class="result-disclaimer-details" open' not in html,
        "full medical/scope disclaimer is available but collapsed by default")
require("make('overview','今年的年度概況'" in html, "summary uses a plain-language year heading")
require(re.search(r"\{id:'guide7step',advanced:true,", defs) is not None, "objective seven-step guide remains available as its own route")
require('if (readingGuide) readingGuide.hidden = true;' in html and 'if(_readingGuide)_readingGuide.hidden=false;' in html,
        "objective and personalized routes show the relevant reading instructions")
header_start = html.find('<header class="result-header">')
header_end = html.find('</header>', header_start)
require(header_start >= 0 and header_end > header_start and 'id="navDrawerToggleBtn"' in html[header_start:header_end],
        "function index button is in the result toolbar rather than floating over page content")
require(".nav-drawer-toggle-btn{position:fixed" not in html, "function index button does not cover content")


print("Result: all user-experience architecture checks passed")
