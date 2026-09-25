# ChemoSim

**An interactive E. coli chemotaxis signaling and flagellar motor simulator**  
**大腸菌の走化性シグナル伝達・べん毛モーター切替を可視化するインタラクティブシミュレーター**

Model version: **0.6** · README updated: **2026-09-25**  
Project maintainer: **Yusuke V. Morimoto（森本 雄祐）, Kyushu Institute of Technology（九州工業大学）**

[English](#english) · [日本語](#日本語) · [Terms of use / 利用条件](#terms-of-use--利用条件)

## English

### Overview

ChemoSim is a browser-based tool for exploring how chemotaxis signaling influences flagellar motor switching in *Escherichia coli*. It connects receptor activity, CheA/CheY/CheZ phosphorylation dynamics, CheR/CheB-mediated adaptation, and stochastic CW/CCW switching of five modeled motors.

Users can change parameters and inspect time courses together with a schematic cell animation. The tool supports teaching, interactive explanation and hypothesis exploration. **It is not a universally calibrated quantitative predictor of wild-type behavior.** Model assumptions, literature reference conditions and limitations are displayed in the interface and accompanying documents.

### Main features

| Feature | Description |
|---|---|
| Signaling pathway | Adjustable CheA, CheY, CheZ, CheR and CheB abundance; specified cell volume and concentration units; conserved CheA-long, CheY and CheB pools |
| Stimulus and adaptation | Attractant/repellent steps, background concentration, pre-stimulus equilibration and an effective receptor modification coordinate |
| Receptor reference profiles | Conditional reconstructions of published Tar–MeAsp and Tsr–serine normalized responses |
| Motor switching | Separate affinity, binding exchange and motor switching controls; explicit stochastic binding and CW/CCW states |
| Cell animation | Polar receptor clusters, relative protein markers, five motors and schematic flagellar bundling/dispersal |
| Analysis | Excitation t90, adaptation half-recovery time, finite-window adaptation precision, replicate simulations, dwell summaries and two-parameter sweeps |
| Calibration | Opt-in, condition-specific fitting across concentrations, held-out validation rows, residuals and session history |
| Export | CSV, graph SVG, PNG and a multipanel Figure mode; CG exported as raster content, including within its SVG wrapper |
| Interface | English by default, with a Japanese toggle; hypothetical perturbation presets |

### Getting started

1. Open the hosted `index.html` page. No account within the simulator or server-side computation is required.
2. Start with the reference settings and select a stimulus, its final concentration and application time. Set the background concentration separately if needed.
3. Change protein abundance or motor parameters and compare the signal traces with the cell animation.
4. Use the playback controls to inspect the stochastic motor states. The signal curve is an ensemble mean; the CG shows one realization of five motors.
5. Use **Run batch** or the two-parameter sweep for repeated simulations. Recompute these analyses after changing settings.
6. Export CSV data or select a graphic for SVG/PNG output. **Figure mode** combines the CG, signal trace, dwell histogram and parameter sweep; compute the corresponding analyses before exporting a complete figure.

All model computation is performed in the browser. Larger replicate counts and sweeps can take longer. Calibration history is held only for the current page session; export the record before closing or reloading the page.

### Motor calibration

No literature fit is applied automatically. Enter one experimental condition at a time, recording strain/genotype, temperature, load, assay, adaptation state, CheY-P provenance and data source. Unknown conditions should be marked as unknown.

The input columns are:

```text
Y_uM,CW_bias,CW_dwell_s,CCW_dwell_s,role
```

Use `fit` for fitting rows and `validate` for rows excluded from fitting. Supply bias alone or both mean dwell durations; leave unmeasured entries blank. Do not substitute median durations for means.

- Binding affinity, binding exchange, site count and switching steepness remain fixed during fitting.
- The occupancy threshold is fitted. Motor switching scale is fitted only when fitting data include both mean dwell durations.
- Bias and paired mean dwells are not three independent constraints: their stationary consistency is checked separately.
- Different loads, temperatures or adaptation states should be fitted separately, not treated as interchangeable observations.
- The optional literature example and synthetic example are demonstrations. Synthetic parameter recovery is not experimental validation.

See [MOTOR_MODEL.md](MOTOR_MODEL.md) for the objective function, parameter bounds, assumptions and reference scope.

### Interpretation and limitations

- Initial parameters are exploratory. Several upstream rate laws and absolute activity scales remain assumptions; receptor reference-curve reconstruction does not establish absolute CheY-P concentrations or adaptation times.
- Temperature and load are recorded as calibration conditions; the model does not infer their physical dependence or interpolate across them.
- Motor input is held constant within 0.2-second signal bins. Fast transient comparisons require additional sampling-resolution checks.
- Explicit motor-bound CheY-P depletion, CheZ complexes, FliM remodeling and motor–motor coupling are omitted.
- The CG, filament behavior and trajectory are schematic, not calibrated mechanical simulations or measurements of swimming/rotation speed.
- Adaptation precision is evaluated within the 60-second observation window, not at infinite time. No response and unreached half recovery are distinguished.
- Complete-dwell histograms exclude censored intervals and can favor shorter dwells. Parameter confidence intervals and full experimental dwell-distribution validation are not provided.
- Numerical checks are not equivalent to independent experimental validation or comprehensive browser compatibility testing.

Model details: [UPSTREAM_MODEL.md](UPSTREAM_MODEL.md) and [MOTOR_MODEL.md](MOTOR_MODEL.md). The upstream document retains its original 0.5 heading for the upstream model introduced in that release. Review scope and remaining checks: [PUBLICATION_REVIEW.md](PUBLICATION_REVIEW.md). Test scripts mentioned in those documents belong to the development checkout and are not included in this static distribution.

### Files and hosting

Keep `index.html`, all `.js` files and both `.css` files together. The accompanying Markdown files document the model and review status. No installation or build step is required for this static distribution.

For the maintainer's GitHub Pages publication, place the files at the repository root and select **Settings → Pages → Deploy from a branch → main → /(root)**. These publication instructions do not grant third parties permission to redistribute or rehost the source.

## 日本語

### 概要

ChemoSimは、大腸菌の走化性シグナル伝達がべん毛モーターの回転切替に与える影響を、ブラウザー上で探索するツールです。受容体活性、CheA・CheY・CheZのリン酸化反応、CheR・CheBによる適応、5個のモーターの確率的なCW／CCW切替を結びつけて表示します。

パラメーター変更による応答の違いを、時系列グラフと細胞の模式的CGで確認できます。教育、機構の説明、仮説の探索を目的としており、**野生型の挙動をあらゆる条件で定量予測できる、全面的に校正済みのモデルではありません。**

### 主な機能

- CheA・CheY・CheZ・CheR・CheBの量、細胞体積、刺激物質、背景濃度、刺激時刻を変更。
- CheA-long・CheY・CheBの総量保存と、刺激前の定常状態の計算。
- Tar–MeAsp、Tsr–セリンの条件付き文献参照曲線。
- 親和性、結合交換速度、モーター切替速度を分離した確率モデル。
- 極の受容体クラスター、タンパク質量の模式表示、複数モーター、べん毛束の形成・解離のCG表示。
- 興奮時間t90、適応50%回復時間、有限観測窓内の適応精度、反復計算、滞在時間解析、2パラメーター探索。
- 実験条件別の任意校正、適合点／検証点の区別、残差表示、セッション内の条件別履歴。
- CSV・PNG・SVG出力、論文・発表用の図を配置するFigure mode。
- 英語／日本語表示切替と、仮想的な変異・摂動プリセット。

### 基本操作

1. 公開ページを開き、標準設定から開始します。
2. 刺激物質、刺激後濃度、刺激時刻を設定します。背景濃度は別に設定できます。
3. タンパク質量やモーターのパラメーターを変更し、グラフとCGを比較します。
4. 再生・一時停止・時間スライダーで状態を確認します。グラフは集団平均、CGは5モーターの1試行です。
5. 必要に応じて反復計算やパラメーター探索を行います。条件変更後は再計算してください。
6. CSVや画像を出力します。Figure modeの全パネルを埋めるには、対応する反復計算と探索を先に実行してください。

CGのSVG出力にはPNG画像が埋め込まれており、CG自体がベクター化されるわけではありません。計算はブラウザー内で行います。校正履歴はページを閉じたり再読み込みしたりすると失われるため、必要な結果を出力してください。

### 校正と結果の解釈

特定論文の適合値は自動適用されません。菌株、温度、負荷、測定法、適応状態、CheY-Pの実測／推定／仮定、出典を記録し、同一条件の濃度ごとの観測値を入力します。異なる実験条件は別々に適合してください。

入力列は `Y_uM,CW_bias,CW_dwell_s,CCW_dwell_s,role` です。`fit` は適合用、`validate` は適合に使わない検証用です。CW biasのみの場合は占有率しきい値を適合し、切替速度は固定します。両状態の平均滞在時間がある場合に切替速度も適合します。親和性、結合交換速度、部位数、切替応答の急峻さは固定されます。

**適合が成功しても、その条件以外での予測精度や生物学的妥当性を保証するものではありません。** 検証点の独立性はデータの取得方法によります。文献例は条件付きの参照例、人工データ例は実装確認用です。

上流には未校正の反応速度や近似が含まれ、絶対濃度・適応時間を同時に実験校正したものではありません。モーター入力は0.2秒区間の一定値近似です。遊離CheY-Pの結合による枯渇、CheZ複合体、FliM再構成、モーター間相互作用は明示的に計算しません。温度・負荷依存則やフィラメント力学も未実装です。

適応精度は60秒の観測窓内で評価します。CGの回転速度、遊泳軌跡、束形成は模式表現です。完全滞在区間だけのヒストグラムには短い滞在を多く数える偏りがあり得ます。数値検証は、独立した実験的検証や全ブラウザーでの動作保証を意味しません。

詳細は [MOTOR_MODEL.md](MOTOR_MODEL.md)、[UPSTREAM_MODEL.md](UPSTREAM_MODEL.md)、[PUBLICATION_REVIEW.md](PUBLICATION_REVIEW.md) を参照してください。上流文書の0.5表記は、そのモデルを導入した版に対応します。文書内で言及するテスト用スクリプトは開発版のもので、この静的配布パッケージには含まれません。

## Citation / 引用・再現性

When reporting results, identify **ChemoSim, model version 0.6**, the actual site/repository URL, access date, parameter settings, random seed and any calibration dataset. Cite the relevant original studies for the mechanisms or measurements being discussed. A formal software-paper citation is not specified in this README.

結果を論文・発表で示す場合は、**ChemoSim、モデルバージョン0.6**、実際の公開URL、アクセス日、パラメーター、乱数seed、使用した校正データを記載してください。機構や測定値に関する主張には対応する原著論文を引用してください。本READMEでは、未確定のソフトウェア論文やDOIを引用情報として指定しません。

## Terms of use / 利用条件

**All rights reserved. This project is not released under an open-source license.**

Use of the publicly hosted simulator through its provided browser interface is permitted. This includes downloading and executing the files as technically necessary for ordinary use of that interface. Public access to the website or source code does **not** constitute permission to reuse the source code.

**Without prior written permission from the copyright holder, redistribution or modification of the source code is not permitted.** This includes redistribution of original or modified copies, creation and distribution of derivative versions, incorporation into other software, and rehosting the simulator on another website or server. These restrictions concern the source code, including HTML, CSS and JavaScript; they do not constitute a separate prohibition on the tool's ordinary data/image export functionality.

This notice does not restrict rights that cannot be excluded under applicable law, rights necessarily granted under the hosting platform's applicable terms, or rights in separately licensed third-party materials. In particular, a public GitHub repository permits viewing and forking as provided by GitHub's Terms of Service; this notice grants no additional permission to modify, redistribute or rehost the code beyond those terms. See [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

Requests for separate permission should be directed to the project maintainer through the contact information on the official project or institutional page. The tool is provided as is, without a guarantee of scientific accuracy, suitability for a particular purpose or uninterrupted operation, to the extent permitted by applicable law.

---

**本ソフトウェアはオープンソースライセンスでは提供していません。ソースコードに関する権利は留保されています。**

公開サイトで提供するブラウザー画面を通じたシミュレーターの利用を認めます。その通常利用に技術的に必要なファイルの取得・実行を含みます。Webサイトやソースコードを閲覧できることは、ソースコードの再利用を許諾するものではありません。

**著作権者の事前の書面による許可なく、ソースコードを再配布・改変することは許諾しません。** 元のコードや改変したコードの再配布、派生版の作成・配布、他のソフトウェアへの組込み、別のWebサイト・サーバーでの再公開を含みます。対象はHTML・CSS・JavaScript等のソースコードであり、通常のデータ・画像出力機能の利用を別途禁止する趣旨ではありません。

ただし、適用法令上排除できない権利、公開先の利用規約により必要となる権利、個別のライセンスが適用される第三者の著作物については、それぞれの法令・規約・ライセンスに従います。特に、GitHubの公開リポジトリでは、GitHubの利用規約に基づく閲覧・forkが認められます。本記載は、その範囲を超える改変・再配布・再公開を追加で許諾するものではありません。

別途許諾が必要な場合は、公式プロジェクトページまたは所属機関のページに掲載された連絡先から管理者へお問い合わせください。本ツールは現状のまま提供し、法令上認められる範囲で、科学的正確性、特定目的への適合性、継続的な提供を保証しません。
