// ==UserScript==
// @name        JAgricola
// @namespace   JAgricola
// @description Agricola sites translates to Japanese.
// @include     http://www.boiteajeux.net/jeux/agr/partie.php*
// @version     2.0.2
// @require     http://code.jquery.com/jquery-1.8.2.js
// @require     https://raw.github.com/kswedberg/jquery-cluetip/master/jquery.cluetip.min.js
// @grant       hoge
// ==/UserScript==

(function() {

    // class
    var Action = function(round, player, action) {
        this.round = round;
        this.player = player;
        this.action = action;
    };

    // global variables
    var cardJson, agrid, drafting, draftWaiting, AUDIO_LIST, lastTurn, alerted;

    // constants
    var ajaxmsec = 10 * 1000;
    var draftMsg = "Choose the improvement and the occupation that you want to add to your hand and confirm.";
    var draftWaitingMsg = "Round #0";

    // main functions
    initialize();
    createCardSpace();
    createDraftCards();

    setAlert();
    if (!(draftWaiting || drafting)) {
        setCardTooltip($('#dvCartesPosees td.clCarteMf'));
        setCardTooltip($('#dvPanneauAmelioration div.clCarteMf'), { leftOffset: 670 + 345 });
        setCardTooltip($('#dvPanneauMain td.clCarteMf'), { leftOffset: 910 + 345 });
        hookShowExp();
        setAjaxHistory();
    }

    // sub functions
    function initialize() {
        cardJson = initializeCardJson();
        agrid = getAgricolaId();
        alerted = agrid + "_alerted";
        drafting = (document.body.innerHTML.match(draftMsg));
        draftWaiting = (document.body.innerHTML.match(draftWaitingMsg));
        lastTurn = 0;
        AUDIO_LIST = {
            "bell": new Audio("http://heaven.gunjobiyori.com/up1157.wav")
        };
    }

    function createCardSpace() {
        $("form[name=fmDraft]").before('<div id="active" />');
        if ($("form[name=fmMiniForum]").length == 0) {
            $("img[src*=cartesenjeu]").parent().next().append('<table id="history" border="0" cellpadding="1" cellspacing="1" width="250"><thead><th class="clEntete">Round</th><th class="clEntete">Player</th><th class="clEntete">Action</th></thead><tbody></tbody></table>');
        } else {
            $("form[name=fmMiniForum]").after('<table id="history" border="0" cellpadding="1" cellspacing="1" width="250"><thead><th class="clEntete">Round</th><th class="clEntete">Player</th><th class="clEntete">Action</th></thead><tbody></tbody></table>');
        }

        $('#conteneur').after('<div id="ja-texts" style="display:none"></div>');
        $('#ja-texts').append('\
<div id="ja-text-1" title="1. かまど"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png"></p>以下の品をいつでも食料にできる。<br>　野菜：2<br>　羊：2<br>　猪：2<br>　牛：3<br>「パンを焼く」のアクションで、小麦：2</div>\
<div id="ja-text-2" title="2. かまど"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionArgile16.png"></p>以下の品をいつでも食料にできる。<br>　野菜：2<br>　羊：2<br>　猪：2<br>　牛：3<br>「パンを焼く」のアクションで、小麦：2</div>\
<div id="ja-text-3" title="3. 調理場"><p style="font-style:italic">コスト: 4x<img align="absmiddle" src="img/pionArgile16.png"> or discard 1 Fireplace</p>以下の品をいつでも食料にできる。<br>　野菜：3<br>　羊：2<br>　猪：3<br>　牛：4<br>「パンを焼く」のアクションで、小麦：3</div>\
<div id="ja-text-4" title="4. 調理場"><p style="font-style:italic">コスト: 5x<img align="absmiddle" src="img/pionArgile16.png"> or discard 1 Fireplace</p>以下の品をいつでも食料にできる。<br>　野菜：3<br>　羊：2<br>　猪：3<br>　牛：4<br>「パンを焼く」のアクションで、小麦：3</div>\
<div id="ja-text-5" title="5. レンガ暖炉"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p></p>「パンを焼く」のアクションのたびに、小麦最大1を食料5にできる。<br>このカードの獲得のとき、追加アクションで「パンを焼く」ができる。</div>\
<div id="ja-text-6" title="6. 石の暖炉"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>「パンを焼く」のアクションのたびに、小麦最大2までそれぞれ食料4にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。</div>\
<div id="ja-text-7" title="7. 製陶所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫のたびにレンガ最大1を食料2にできる。ゲーム終了時にレンガ3/5/7でそれぞれ1/2/3点のボーナスを得る。</div>\
<div id="ja-text-8" title="8. 家具製作所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫のたびに木材最大1を食料2にできる。ゲーム終了時に木材3/5/7でそれぞれ1/2/3点のボーナスを得る。</div>\
<div id="ja-text-9" title="9. かご製作所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionRoseau16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫のたびに葦最大1を食料3にできる。ゲーム終了時に葦2/4/5でそれぞれ1/2/3点のボーナスを得る。</div>\
<div id="ja-text-10" title="10. 井戸"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>これ以降の5ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。</div>\
<div id="ja-text-11" title="11. 畑"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出したらすぐ畑を最大1つ耕す。 コスト: 食1 移動進歩</div>\
<div id="ja-text-12" title="12. 釣竿"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「漁」のアクションのたびに、追加で食料1を得る。ラウンド8からは追加で食料2を得る。 コスト: 木1</div>\
<div id="ja-text-13" title="13. 斧"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>木の家の増築はいつも木材2と葦2でできる。 コスト: 木1・石1</div>\
<div id="ja-text-14" title="14. パン焼き暖炉"><p style="font-style:italic">コスト:なし<br>条件: discard 1 Oven</p>「パンを焼く」のアクションのたびに、小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 暖炉1枚を返す</div>\
<div id="ja-text-15" title="15. パン焼き桶"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>レンガ暖炉と石の暖炉が小さい進歩になり好きな資材1つ安くなる。木の暖炉も資材1つ安くなる。 コスト: 木1</div>\
<div id="ja-text-16" title="16. 建築資材"><p style="font-style:italic">コスト:なし</p>このカードを出したらすぐ木材１かレンガ1を得る。 移動進歩</div>\
<div id="ja-text-17" title="17. 風車小屋"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>パンを焼かずにいつでも小麦1を食料2にできる。 コスト: 木3・石1</div>\
<div id="ja-text-18" title="18. マメ畑"><p style="font-style:italic">コスト:なし<br>条件: 2 Occupation(s)</p>種まきで、このカードの上に畑と同じように野菜を植えられる。（このカードは得点計算で畑に含めない） 条件: 職業2</div>\
<div id="ja-text-19" title="19. 三つ足やかん"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png"></p>かまど○の進歩で2つの品物を食料にするたびに食料をもう1つ得る。 コスト: レ2</div>\
<div id="ja-text-20" title="20. 簡易かまど"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png"></p>以下の品をいつでも食料にできる。野菜：2　羊：1　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2 コスト: レ1</div>\
<div id="ja-text-21" title="21. 木骨の小屋"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionRoseau16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>ゲーム終了時に石の家の広さ1スペースにつき、ボーナス1点を得る。（ヴィラと両方持っている場合、ヴィラのボーナスのみ得る。） コスト: 木1・レ1・葦1・石2</div>\
<div id="ja-text-22" title="22. いかだ"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>「漁」のアクションのたびに追加の食料1か葦1を得る。 コスト: 木2</div>\
<div id="ja-text-23" title="23. かいば桶"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時に、牧場の広さの合計が6/7/8/9マス以上で、ボーナス1/2/3/4点を得る。 コスト: 木2</div>\
<div id="ja-text-24" title="24. 檻"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 4 Occupation(s)</p>これ以降のラウンドのスペース全部にそれぞれ食料2を置く。これらのラウンドのはじめにその食料を得る。 コスト: 木2 条件: 職業4</div>\
<div id="ja-text-25" title="25. スパイス"><p style="font-style:italic">コスト:なし</p>かまど○の進歩カードで野菜を食料にするたびに追加で食料1を得る。</div>\
<div id="ja-text-26" title="26. かんな"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>家具製作所・製材所・家具職人で、木材1を食料に換えると追加で食料1を得る。あるいは木材をもう1つ払って食料2に換えられる。 コスト: 木1</div>\
<div id="ja-text-27" title="27. 木の暖炉"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionPierre16.png"></p>「パンを焼く」のアクションのたびにいくつでも小麦1つにつき食料3にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 木3・石1</div>\
<div id="ja-text-28" title="28. 木のスリッパ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時に、レンガの家でボーナス1点、石の家でボーナス2点を得る。 コスト: 木1</div>\
<div id="ja-text-29" title="29. 角笛"><p style="font-style:italic">コスト:なし<br>条件: 1x<img align="absmiddle" src="img/pionMouton16.png"></p>厩の有無に関わらず、羊のいる牧場はそれぞれ追加で2頭まで飼える。柵で囲んでいない厩は羊2頭まで飼える。（この効果は家畜庭、動物園にも適用される） 条件: 羊1</div>\
<div id="ja-text-30" title="30. カヌー"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>「漁」のアクションのたびに、追加で食料1と葦1を得る。 コスト: 木2 条件: 職業2</div>\
<div id="ja-text-31" title="31. 鯉の池"><p style="font-style:italic">コスト:なし<br>条件: 1 Occupation(s) and 2 Improvement(s)</p>これ以降の奇数ラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業1・進歩2</div>\
<div id="ja-text-32" title="32. じゃがいも掘り"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>種をまくたびに、野菜を新しく植えた畑全部にもう1つ野菜を置く。 コスト: 木1</div>\
<div id="ja-text-33" title="33. 陶器"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png"><br>条件: a Oven</p>このカードを出すとすぐに食料2を得る。今後、製陶所は小さい進歩になり無料で作れる。 コスト: レ1 条件: 暖炉1</div>\
<div id="ja-text-34" title="34. かご"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png"></p>スペースから木材を取るアクションのたびに、木材2をそのスペースに残して食料3を得ることができる。 コスト: 葦1</div>\
<div id="ja-text-35" title="35. 穀物スコップ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「小麦を取る」のアクションのたびに、小麦をもう1つ得る。 コスト: 木1</div>\
<div id="ja-text-36" title="36. レンガの屋根"><p style="font-style:italic">コスト:なし<br>条件: 1 Occupation(s)</p>増築か改築をするとき、葦1または2を同数のレンガで代用できる。 条件: 職業1</div>\
<div id="ja-text-37" title="37. レンガの柱"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>レンガの家を増築するたびに、レンガ5と葦2をレンガ2と木材1と葦1で代用できる。 コスト: 木2</div>\
<div id="ja-text-38" title="38. 聖マリア像"><p style="font-style:italic">コスト:なし</p>効果なし。（捨てた進歩カードによって得られるはずだった品物は全てなくなる） コスト: プレイ済み進歩2</div>\
<div id="ja-text-39" title="39. 露店"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionCereale16.png"></p>このカードを出したらすぐ野菜1を得る。 コスト: 麦1 移動進歩</div>\
<div id="ja-text-40" title="40. 小牧場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出したらすぐ1スペースを柵で囲んで牧場にする。（柵のコストの木材は不要） コスト: 食2 移動進歩</div>\
<div id="ja-text-41" title="41. 石臼"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPierre16.png"></p>パンを焼いて小麦を食料にするたびに、追加で食料2を得る。（パンを焼くアクション1回につき食糧2） コスト: 石1</div>\
<div id="ja-text-42" title="42. 親切な隣人"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"> or 1x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードを出したらすぐ、石材1か葦1を得る。 コスト: 木1/レ1 移動進歩</div>\
<div id="ja-text-43" title="43. 果物の木"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>ラウンド8-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3</div>\
<div id="ja-text-44" title="44. 離れのトイレ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionArgile16.png"></p>効果なし。他の人の中に、職業2つ未満の人がいるときのみに建てられる。 コスト: 木1・レ1</div>\
<div id="ja-text-45" title="45. 個人の森"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>これ以降の偶数ラウンドのスペースに、それぞれ木材1を置く。これらのラウンドのはじめにその木材を得る。 コスト: 食2</div>\
<div id="ja-text-46" title="46. 荷車"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>ラウンド5・8・11・14のうちまだ始まっていないラウンドのスペースに、それぞれ小麦1を置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木2 条件: 職業2</div>\
<div id="ja-text-47" title="47. レタス畑"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>このカードの上に種まきのとき畑と同じように野菜を植えられる。ここから収穫してすぐに食料にすると食料4になる。（このカードは得点計算で畑に含めない） 条件: 職業3</div>\
<div id="ja-text-48" title="48. 葦の池"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>これ以降の3ラウンドのスペースにそれぞれ葦1を置く。これらのラウンドのはじめにその葦を得る。 条件: 職業3</div>\
<div id="ja-text-49" title="49. 書き机"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>「職業」のアクションで、2つの職業を続けて出せる。2枚目の職業を出すには、1枚目のコストに加えてさらに食料2を支払う。 コスト: 木1 条件: 職業2</div>\
<div id="ja-text-50" title="50. へら"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「改築」のアクションなしに、木の家をいつでもレンガの家に改築できる。（資材は支払う） コスト: 木1</div>\
<div id="ja-text-51" title="51. 糸巻き棒"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>収穫で畑フェイズのたび羊を3匹持っていれば食料1、5匹持っていれば食料2を得る。 コスト: 木1</div>\
<div id="ja-text-52" title="52. 厩"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>このカードを出したらすぐ厩を1つ無料で建てる。 コスト: 木1 移動進歩</div>\
<div id="ja-text-53" title="53. 撹乳器"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>収穫で畑フェイズのたびに羊がいれば羊3匹につき食料1を得る。同じく牛がいれば牛2匹につき食料1を得る。 コスト: 木2</div>\
<div id="ja-text-54" title="54. 石切り場"><p style="font-style:italic">コスト:なし<br>条件: 4 Occupation(s)</p>「日雇い労働者」のアクションのたびに、追加で石材3を得る。 条件: 職業4</div>\
<div id="ja-text-55" title="55. 石の家増築"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>このカードを出したらすぐ、石の家が1スペース増築される。 コスト: 葦1・石3 移動進歩</div>\
<div id="ja-text-56" title="56. 石ばさみ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ラウンド5-7か、ラウンド10-11で登場する「石材」のアクションのたびに、石材をもう1つ得る。 コスト: 木1</div>\
<div id="ja-text-57" title="57. ハト小屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPierre16.png"></p>ラウンド10-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 石2</div>\
<div id="ja-text-58" title="58. 家畜庭"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1 Occupation(s)</p>このカードの上に好きな動物を2頭置ける。種類が異なっていても良い。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業1</div>\
<div id="ja-text-59" title="59. 水飲み場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>厩の有無に関わらず、自分の牧場は全て家畜が2頭多く入るようになる。（この効果は家畜庭、動物園にも適用される） コスト: 木2</div>\
<div id="ja-text-60" title="60. 家畜市場"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionMouton16.png"></p>このカードを出したらすぐ牛1を得る。 コスト: 羊1 移動進歩</div>\
<div id="ja-text-61" title="61. 鋤車"><p style="font-style:italic">コスト: 4x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3 Occupation(s)</p>ゲーム中2回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木4 条件: 職業3</div>\
<div id="ja-text-62" title="62. 折り返し鋤"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>ゲーム中1回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木3 条件: 職業2</div>\
<div id="ja-text-63" title="63. 突き鋤"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1 Occupation(s)</p>ゲーム中に2回、「畑を耕す」のアクションで耕せる畑が１つから2つになる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木2 条件: 職業1</div>\
<div id="ja-text-64" title="64. 喜捨"><p style="font-style:italic">コスト:なし</p>このカードを出した時点で、既に終わっているラウンド数だけ食料を得る。 条件: 職業なし 移動進歩</div>\
<div id="ja-text-65" title="65. パン焼き部屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPierre16.png"><br>条件: discard 1 Oven</p>「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石2</div>\
<div id="ja-text-66" title="66. 村の井戸"><p style="font-style:italic">コスト:なし<br>条件: discard the Well</p>これ以降の3ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 井戸を返す</div>\
<div id="ja-text-67" title="67. 脱穀そり"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションが行える。 コスト: 木2 条件: 職業2</div>\
<div id="ja-text-68" title="68. 馬鍬"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム中に1回だけ、「畑を耕す」か「畑を耕して種をまく」のアクションで耕せる畑が1つから2つになる。他の人もゲーム中に1回だけ、手番にあなたに食料2を払って同じことができる。 コスト: 木2</div>\
<div id="ja-text-69" title="69. イチゴ花壇"><p style="font-style:italic">コスト:なし<br>条件: 2 Vegetable field(s)</p>これ以降3ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑2</div>\
<div id="ja-text-70" title="70. 地固め機"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>他の人が馬鍬か鋤類を使うたびに、すぐに畑1つを耕せる。 コスト: 木1</div>\
<div id="ja-text-71" title="71. 別荘"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"> or 3x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"></p>ラウンド14で家族を一切使えない。このカードはラウンド13までに出すこと。 コスト: （木3/レ3）・葦2</div>\
<div id="ja-text-72" title="72. ガチョウ池"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>これ以降4ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3</div>\
<div id="ja-text-73" title="73. ゲスト"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出したらゲストトークンを取り、次のラウンドに家族として1回だけ使用できる。 コスト: 食2 移動進歩</div>\
<div id="ja-text-74" title="74. 小麦車"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>「小麦1を取る」のアクションのたびに、追加で小麦2を得る。 コスト: 木2 条件: 職業2</div>\
<div id="ja-text-75" title="75. 手挽き臼"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫で食糧供給フェイズのたびに小麦1を食料2にするか、小麦2を食料4にできる。 コスト: 石1</div>\
<div id="ja-text-76" title="76. くまで"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時に畑が5つ以上あればボーナス2点を得る。くびき・馬鍬・地固め機・鋤類のいずれかを出していれば畑が6つ必要。 コスト: 木1</div>\
<div id="ja-text-77" title="77. 牧人の杖"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>区切られていない4スペース以上の牧場を新たに囲むたびに、その牧場に羊2頭を置く。 コスト: 木1</div>\
<div id="ja-text-78" title="78. 雑木林"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1 Occupation(s)</p>「種をまく」のアクションのたびに、このカードの上に木材を植えることができる。最大2つまで植えることができる。木材は畑の小麦のように扱い、畑フェイズで収穫する。（このカードは得点計算で畑に数えない） コスト: 木2 条件: 職業1</div>\
<div id="ja-text-79" title="79. 木材荷車"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3 Occupation(s)</p>アクションで木材を取るたびに、追加で木材2を得る。（この効果は木材が累積するスペースから木材を得た時のみ） コスト: 木3 条件: 職業3</div>\
<div id="ja-text-80" title="80. 林"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3 Occupation(s)</p>他の人が「木材3」のアクションを行うたびに、その中から1つをもらう。 コスト: 木1 条件: 職業3</div>\
<div id="ja-text-81" title="81. 木の家増築"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png">5x<img align="absmiddle" src="img/pionBois16.png"></p>このカードを出したらすぐ木の家が1部屋増える。 コスト: 葦1・木5</div>\
<div id="ja-text-82" title="82. 木のクレーン"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"></p>ラウンド5-7とラウンド10-11で登場する「石材1」のアクションのたびに、追加で石材1を得る。そのとき食料1を払えば追加分が石材1から石材2になる。 コスト: 木3</div>\
<div id="ja-text-83" title="83. 林道"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 木1</div>\
<div id="ja-text-84" title="84. 鶏小屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">1x<img align="absmiddle" src="img/pionRoseau16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionRoseau16.png"></p>これ以降の8ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 コスト: （木2/レ2）・葦1</div>\
<div id="ja-text-85" title="85. 調理コーナー"><p style="font-style:italic">コスト:なし<br>条件: discard 1 Cooking Hearth</p>以下の品をいつでも食料にできる。野菜：4　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: 調理場を返す</div>\
<div id="ja-text-86" title="86. 乾燥小屋"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionRoseau16.png"></p>畑フェイズの後で空いている畑があれば、すぐに小麦を植えられる。ただし置く小麦は1つ少なくなる。 コスト: （木2/レ2）・葦2</div>\
<div id="ja-text-87" title="87. かめ"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionArgile16.png"></p>誰かが井戸を作るか村の井戸に改良するたびに、他の人は食料1、自分は食料4を得る。（すでに井戸がある場合はカードを出したときに得る） コスト: レ1</div>\
<div id="ja-text-88" title="88. 投げ縄"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png"></p>家族を続けて2人置ける。ただしそのうち少なくとも1人は「猪1」「牛1」「羊1」のいずれかに置くこと。 コスト: 葦1</div>\
<div id="ja-text-89" title="89. レンガ道"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionArgile16.png"></p>最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: レ3</div>\
<div id="ja-text-90" title="90. プランター"><p style="font-style:italic">コスト:なし<br>条件: 2 Occupation(s)</p>家と接する畑に種をまくたびに、その畑に追加で小麦2か野菜1が置かれる。 条件: 職業2　</div>\
<div id="ja-text-91" title="91. はしご"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>増築や改築、水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋を作るたびに、コストの葦を1つ減らせる。 コスト: 木2</div>\
<div id="ja-text-92" title="92. 堆肥"><p style="font-style:italic">コスト:なし<br>条件: 2 animal(s)</p>収穫しないラウンドの最後でも、全ての畑から小麦1か野菜1を取ることができる。（収穫する場合は全ての畑から収穫しなければならない） 条件: 家畜2</div>\
<div id="ja-text-93" title="93. 酪農場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫で畑フェイズのたびに、はじめに全員の農場にいる全ての羊と牛を数える。羊5頭、牛3頭につきそれぞれ食料1を得る。 コスト: レ2・石3</div>\
<div id="ja-text-94" title="94. 舗装道路"><p style="font-style:italic">コスト: 5x<img align="absmiddle" src="img/pionPierre16.png"></p>最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 石5</div>\
<div id="ja-text-95" title="95. 梁"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「漁」か葦を取るアクションのたびに追加で食料1を得る。 コスト: 木1</div>\
<div id="ja-text-96" title="96. 葦の交換"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードを出したらすぐに葦2を得る。 コスト: 木2/レ2 移動進歩</div>\
<div id="ja-text-97" title="97. 畜殺場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>他の人が家畜を1頭以上、食料にするたびにストックから食料1を得る。食糧供給フェイズでは手番が最後になる。 コスト: レ2・石2</div>\
<div id="ja-text-98" title="98. 火酒製造所"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionLegume16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫で食糧供給フェイズのたびに野菜最大1を食料4にできる。ゲーム終了時に5つ目と6つ目の野菜1つにつき、それぞれボーナス1点を得る。 コスト: 野1・石2</div>\
<div id="ja-text-99" title="99. わら小屋"><p style="font-style:italic">コスト:なし<br>条件: 3 Grain field(s)</p>増築や改築を行うときに、葦がもう不要になる。 条件: 小麦畑3</div>\
<div id="ja-text-100" title="100. 酒場"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>このカードは追加のアクションスペースになる。ここで他の人がアクションを行うと食料3を得る。自分でアクションを行うと、食料3かボーナス2点のどちらかを得る。 コスト: 木2・石2</div>\
<div id="ja-text-101" title="101. 家畜の餌"><p style="font-style:italic">コスト:なし<br>条件: 4 planted field(s)</p>得点計算の直前に、1匹以上所有している家畜の種類ごとに1匹ずつ増える。（農場内に置き場所が必要） 条件: 栽培中の畑4</div>\
<div id="ja-text-102" title="102. 動物園"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>このカードの上に羊と猪と牛を各1頭ずつまでおくことができる。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業2</div>\
<div id="ja-text-103" title="103. 水車"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">2x<img align="absmiddle" src="img/pionArgile16.png">1x<img align="absmiddle" src="img/pionRoseau16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>全員が畑フェイズのたびに小麦最大1を食料3にできる。他の人がこれを行ったら、その中から食料1をもらう。 コスト: 木1・レ2・葦1・石2</div>\
<div id="ja-text-104" title="104. 週末市場"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionCereale16.png"></p>このカードを出したらすぐに野菜2を得る。 コスト: 麦3 移動進歩</div>\
<div id="ja-text-105" title="105. 平地"><p style="font-style:italic">コスト:なし<br>条件: 1 Occupation(s)</p>種をまくとき、畑2つに植えるようにしてこのカードの上に小麦2を植えることができる。（このカードは得点計算で畑に含めない） 条件: 職業1</div>\
<div id="ja-text-106" title="106. パン焼き小屋"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionPierre16.png"><br>条件: discard 1 Oven</p>「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石3</div>\
<div id="ja-text-107" title="107. 建築用木材"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPierre16.png"></p>このカードを出したらすぐに、木材3を得る。 コスト: 石1 移動進歩</div>\
<div id="ja-text-108" title="108. ミツバチの巣"><p style="font-style:italic">コスト:なし<br>条件: 2 Improvement(s) and 3 Occupation(s)</p>これ以降の偶数ラウンドのスペースに、それぞれ食料を2つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 進歩2・職業3</div>\
<div id="ja-text-109" title="109. 焼き串"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>収穫で食糧供給フェイズのたびに家畜を1頭以上食料にすると、追加で食料1を得る。 コスト: 木1</div>\
<div id="ja-text-110" title="110. 醸造所"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionCereale16.png">2x<img align="absmiddle" src="img/pionPierre16.png"></p>収穫で食糧供給フェイズのたびに、小麦最大1を食料3にできる。ゲーム終了時に収穫した小麦が9つ以上あればボーナス1点を得る。 コスト: 麦2・石2</div>\
<div id="ja-text-111" title="111. パン焼き棒"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>職業を出すたびに、続けて「パンを焼く」のアクションができる。 コスト: 木1</div>\
<div id="ja-text-112" title="112. 本棚"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3 Occupation(s)</p>職業を1つ出すたびに食料3を得る。この食料は、その職業を出すコストに使用できる。 コスト: 木1 条件: 職業3</div>\
<div id="ja-text-113" title="113. 脱穀棒"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1 Occupation(s)</p>「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションができる。 コスト: 木1 条件: 職業1</div>\
<div id="ja-text-114" title="114. 鴨の池"><p style="font-style:italic">コスト:なし<br>条件: 2 Occupation(s)</p>これ以降の3ラウンドのスペースに食料をそれぞれ1つずつ置く。これらのラウンドの最初にその食料を得る。 条件: 職業2</div>\
<div id="ja-text-115" title="115. 耕運鋤"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 3 Occupation(s)</p>ゲーム中2回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業3</div>\
<div id="ja-text-116" title="116. 穀物倉庫"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"> or 3x<img align="absmiddle" src="img/pionArgile16.png"></p>ラウンド8・10・12のうちまだ始まっていないラウンドのスペースに小麦を1つずつ置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木3/レ3</div>\
<div id="ja-text-117" title="117. 温室"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1 Occupation(s)</p>現在のラウンドに4と7を足す。そのラウンドのスペースにそれぞれ野菜を1つずつ置き、ラウンドのはじめに食料1を払えばその野菜を得る。 コスト: 木2 条件: 職業1</div>\
<div id="ja-text-118" title="118. 肥溜め"><p style="font-style:italic">コスト:なし<br>条件: 4 animal(s)</p>種まきで毎回、新しく植えた畑に小麦1か野菜1を追加で置く。 条件: 家畜4</div>\
<div id="ja-text-119" title="119. 鉤型鋤"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1 Occupation(s)</p>ゲーム中1回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業1</div>\
<div id="ja-text-120" title="120. ヤギ"><p style="font-style:italic">コスト:なし</p>食糧供給フェイズのたびに食糧1を得る。自分の家にはこのヤギ以外の動物を飼えなくなる。（調教師があっても不可）</div>\
<div id="ja-text-121" title="121. 木挽き台"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"></p>自分の牧場におく次の厩と3・6・9・12・15本目の柵は無料になる。（柵は牧場を完全に囲む形でしか置けない） コスト: 木2</div>\
<div id="ja-text-122" title="122. 製材所"><p style="font-style:italic">コスト:なし<br>条件: discard the Joinery</p>収穫のたびに、木材最大1を食料3にできる。ゲーム終了時に木材2/4/5でそれぞれ1/2/3点のボーナスを得る。（この後にまた家具製作所を獲得してもボーナス点はない） コスト: 家具製作所を返す</div>\
<div id="ja-text-123" title="123. 木の宝石箱"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>ゲーム終了時、家の広さが5部屋なら2点、6部屋なら4点のボーナスを得る。 コスト: 木1</div>\
<div id="ja-text-124" title="124. くびき"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 1x<img align="absmiddle" src="img/pionBoeuf16.png"></p>このカードを出すとすぐに、場に出ている全ての鋤類の数だけ畑を耕せる。（自分で出している分は数えない） コスト: 木1 条件: 牛1</div>\
<div id="ja-text-125" title="125. ほうき"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>手札の小さい進歩を全て捨て、新たに7枚引く。そしてすぐにコストを支払い、1枚実行できる。 コスト: 木1</div>\
<div id="ja-text-126" title="126. 柄付き網"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png"></p>アクションで葦を取るたび、追加で食料2を得る。葦以外に他の資材も同時に取る場合は、追加で食料1を得る。 コスト: 葦1</div>\
<div id="ja-text-127" title="127. がらがら"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"></p>「家族を増やす」のアクションのたびに（またはこのカードを出したラウンドに新しい家族が生まれていたら）、小麦が1つ以上ある畑にさらに小麦1を置く。 コスト: 木1</div>\
<div id="ja-text-128" title="128. 調理場"><p style="font-style:italic">コスト:なし<br>条件: discard 1 Fireplace</p>以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: かまどを返す</div>\
<div id="ja-text-129" title="129. 穀物の束"><p style="font-style:italic">コスト:なし</p>このカードを出したらすぐに小麦1を得る。 移動進歩</div>\
<div id="ja-text-130" title="130. 薬草畑"><p style="font-style:italic">コスト:なし<br>条件: 1 Vegetable field(s)</p>これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑1</div>\
<div id="ja-text-131" title="131. レンガ坑"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>「日雇い労働者」のアクションのたびに、追加でレンガ3を得る。 条件: 職業3</div>\
<div id="ja-text-132" title="132. レンガの家増築"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionRoseau16.png">4x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードを出すとすぐに、レンガの家が1部屋増築される。 コスト: 葦1・レ4 移動進歩</div>\
<div id="ja-text-133" title="133. 搾乳台"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>収穫の畑フェイズのたびに牛を1/3/5頭持っていればそれぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につきボーナス1点を得る。 コスト: 木1 条件: 職業2</div>\
<div id="ja-text-134" title="134. 牛車"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2x<img align="absmiddle" src="img/pionBoeuf16.png"></p>このカードを出したらすぐ、まだ始まっていないラウンドの数だけ（ただし最大3まで）畑を耕せる。 コスト: 木3 条件: 牛2</div>\
<div id="ja-text-135" title="135. ウマ"><p style="font-style:italic">コスト:なし</p>ゲーム終了時、1種類の動物を1頭も持っていなかったら、ボーナス2点を得る。（いない家畜の代わりとして扱う。ただし、このカードの効果で家畜一種を補完した状態では、職業カード『村長』のボーナスを獲得できない。）</div>\
<div id="ja-text-136" title="136. 柴屋根"><p style="font-style:italic">コスト:なし<br>条件: 2 Occupation(s)</p>増築や改築で、葦1か2を同数の木材に変えられる。 条件: 職業2</div>\
<div id="ja-text-137" title="137. カブ畑"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>種まきで、このカードの上に畑と同じように野菜を植えることができる。このカードを出したとき、追加で「種をまく」のアクションができる。（このカードは得点計算で畑に含めない） 条件: 職業3</div>\
<div id="ja-text-138" title="138. 葦の家"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png">4x<img align="absmiddle" src="img/pionRoseau16.png"></p>まだ登場していない家族コマをこのカードの上に置き、ゲーム終了時までここに住む。今のラウンドからアクションに使うことができ、食糧供給しなければならず、得点にならない。（後から「家族を増やす」のアクションで家に入れることができる） コスト: 木1・葦4</div>\
<div id="ja-text-139" title="139. 寝室"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Grain field(s)</p>他の人の家族が置いてあっても、家族を増やすアクションに家族を置いて実行できる。 コスト: 木1 条件: 小麦畑2</div>\
<div id="ja-text-140" title="140. 白鳥の湖"><p style="font-style:italic">コスト:なし<br>条件: 4 Occupation(s)</p>これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業4</div>\
<div id="ja-text-141" title="141. 猪の飼育"><p style="font-style:italic">コスト: 1x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出したらすぐに、猪1を得る。 コスト: 食1 移動進歩</div>\
<div id="ja-text-142" title="142. 石車"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>これ以降の偶数ラウンドのスペースに石材をそれぞれ1つずつ置く。これらのラウンドの最初にその石材を得る。 コスト: 木2 条件: 職業2</div>\
<div id="ja-text-143" title="143. 石の交換"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"> or 2x<img align="absmiddle" src="img/pionArgile16.png"></p>このカードを出したらすぐに、石材2を得る。 コスト: 木2/レ2 移動進歩</div>\
<div id="ja-text-144" title="144. ヴィラ"><p style="font-style:italic">コスト: 3x<img align="absmiddle" src="img/pionBois16.png">3x<img align="absmiddle" src="img/pionArgile16.png">2x<img align="absmiddle" src="img/pionRoseau16.png">3x<img align="absmiddle" src="img/pionPierre16.png"></p>ゲーム終了時、石の家1部屋につきボーナス2点を得る。（木骨の小屋とヴィラを持っている場合、ボーナス得点はヴィラのみになる） コスト: 木3・レ3・葦2・石3</div>\
<div id="ja-text-145" title="145. 森の牧場"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>このカードの上に猪を何匹でも置ける。（このカードは得点計算で牧場に含めない） 条件: 職業3</div>\
<div id="ja-text-146" title="146. 織機"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionBois16.png"><br>条件: 2 Occupation(s)</p>畑フェイズのたびに羊を1/4/7頭持っていれば、それぞれ食料1/2/3を得る。ゲーム終了時に羊3頭につき1点のボーナスを得る。 コスト: 木2 条件: 職業2</div>\
<div id="ja-text-147" title="147. 畑商人"><p style="font-style:italic">コスト:なし</p>「野菜1を取る」のアクションのたびに追加で小麦1を取る。このカードを出したときにストックから野菜1を得る。</div>\
<div id="ja-text-148" title="148. 大学者"><p style="font-style:italic">コスト:なし</p>小さい進歩を使う時や、代官・家庭教師で得点するときに、このカードを職業2つに数える。</div>\
<div id="ja-text-149" title="149. パン焼き長老"><p style="font-style:italic">コスト:なし</p>自分がパン○のついた設備を持っていれば、他の人がパンを焼くたびパンを焼ける。自分で焼くときは追加で食料1を得る。</div>\
<div id="ja-text-150" title="150. パン職人"><p style="font-style:italic">コスト:なし</p>収穫のたびにパン○の付いた進歩カードがあれば、食糧供給フェイズのはじめにパンを焼くことができる。このカードを出したときに、追加アクションとしてパンを焼くことができる。</div>\
<div id="ja-text-151" title="151. 建築士"><p style="font-style:italic">コスト:なし</p>家が5部屋以上になったら、ゲーム中に1度だけ好きなタイミングで無料で1部屋増築できる。</div>\
<div id="ja-text-152" title="152. イチゴ集め"><p style="font-style:italic">コスト:なし</p>アクションで木材を取るたびに、追加で食料1を得る。</div>\
<div id="ja-text-153" title="153. 托鉢僧"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に、物乞いカードを2枚まで返すことができ、返したカード分のマイナス点が入らない。</div>\
<div id="ja-text-154" title="154. 醸造師"><p style="font-style:italic">コスト:なし</p>収穫で食糧供給フェイズのたびに、小麦1（最大1つまで）を食料3にできる。</div>\
<div id="ja-text-155" title="155. パン屋"><p style="font-style:italic">コスト:なし</p>誰か（自分も含む）がパンを焼くたびに、食料にした小麦1つにつき食料1を得る。</div>\
<div id="ja-text-156" title="156. ブラシ作り"><p style="font-style:italic">コスト:なし</p>食料にした猪をこのカードの上に置くことが出来る。ゲーム終了時にここの猪が2/3/4頭ならば、それぞれ1/2/3点のボーナスを得る。</div>\
<div id="ja-text-157" title="157. 屋根がけ"><p style="font-style:italic">コスト:なし</p>増築・改築・水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋の建設で葦を1つ安くできる。</div>\
<div id="ja-text-158" title="158. 旋盤職人"><p style="font-style:italic">コスト:なし</p>いつでも木材を食料にできる。木材1につき食料1。</div>\
<div id="ja-text-159" title="159. 家長"><p style="font-style:italic">コスト:なし</p>「増築」と「家族を増やす」が含まれるアクションを、他の人がすでに選んでいても行える。</div>\
<div id="ja-text-160" title="160. 農場主"><p style="font-style:italic">コスト:なし</p>次に柵を作るとき、猪1を得る。それ以降、柵を1本以上作るたびに牛1を得る。</div>\
<div id="ja-text-161" title="161. 漁師"><p style="font-style:italic">コスト:なし</p>漁のアクションのたびにそこに置いてある食料の2倍を得る。ただし釣竿・いかだ・カヌー・梁・柄付き網の所有者がいたらそれぞれ食料1ずつ与える。</div>\
<div id="ja-text-162" title="162. 肉屋"><p style="font-style:italic">コスト:なし</p>暖炉を持っていれば家畜をいつでも以下の割合で食料にできる。羊；2　猪：3　牛：4　</div>\
<div id="ja-text-163" title="163. 畑守"><p style="font-style:italic">コスト:なし</p>「野菜1を取る」「畑1を耕す」「畑1を耕し種をまく」のアクションを、他の人がすでに選んでいてもそのアクションスペースを使って行える。</div>\
<div id="ja-text-164" title="164. 営林士"><p style="font-style:italic">コスト:なし</p>3人ゲームから「木材2」のアクションカードを追加する。各ラウンドのはじめに木材2をその上に置く。この森を使う人から食料2をもらう。</div>\
<div id="ja-text-165" title="165. 自由農夫"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に、未使用の農場スペースと物乞いだけがマイナス点になる。</div>\
<div id="ja-text-166" title="166. 庭職人"><p style="font-style:italic">コスト:なし</p>「日雇い労働者」のアクションのたびに、追加で野菜1を得る。</div>\
<div id="ja-text-167" title="167. 奇術師"><p style="font-style:italic">コスト:なし</p>「小劇場」のアクションのたびに、追加で小麦1を得る。</div>\
<div id="ja-text-168" title="168. 八百屋"><p style="font-style:italic">コスト:なし</p>「小麦1を取る」のアクションのたびに追加で野菜1を得る。</div>\
<div id="ja-text-169" title="169. 昔語り"><p style="font-style:italic">コスト:なし</p>「小劇場」のアクションのたびに食料1をそのスペースに残して、代わりに野菜1を得る。</div>\
<div id="ja-text-170" title="170. 大農場管理人"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に3種類の家畜のそれぞれで自分より多い人がいなければ、3/4/5人プレイでそれぞれ2/3/4点ボーナスを得る。</div>\
<div id="ja-text-171" title="171. 港湾労働者"><p style="font-style:italic">コスト:なし</p>いつでも木材3をレンガ1か葦1か石材1のいずれかに交換できる。または、レンガ2/葦2/石材2のいずれかを好きな資材1と交換できる。</div>\
<div id="ja-text-172" title="172. 族長"><p style="font-style:italic">コスト: 2x<img align="absmiddle" src="img/pionPN16.png"></p>ゲーム終了時に石の家の1部屋につき1点追加ボーナス。このカードを出すには、追加で食料2が必要。</div>\
<div id="ja-text-173" title="173. 族長の娘"><p style="font-style:italic">コスト:なし</p>他の人が「族長」を出したら、コスト無しでこのカードをすぐ出すことができる。ゲーム終了時に石の家なら3点、レンガの家なら1点を追加で得る。</div>\
<div id="ja-text-174" title="174. 家庭教師"><p style="font-style:italic">コスト:なし</p>ゲーム終了時、このカードの後に出した職業1枚につき1点のボーナスを得る。</div>\
<div id="ja-text-175" title="175. 柵管理人"><p style="font-style:italic">コスト:なし</p>柵を1つ以上置くたびに無料でさらに3つ置くことが出来る。（柵は牧場を完全に囲む形でしか置けない）</div>\
<div id="ja-text-176" title="176. 木こり"><p style="font-style:italic">コスト:なし</p>アクションで木材を取るたびに、追加で木材1を得る。</div>\
<div id="ja-text-177" title="177. 木大工"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に、木の部屋1部屋につきボーナス1点を得る。</div>\
<div id="ja-text-178" title="178. 小屋大工"><p style="font-style:italic">コスト:なし</p>ラウンド1-4に出せば、第11ラウンドのはじめに無料で1スペース増築できる。（石の家を除く）</div>\
<div id="ja-text-179" title="179. 販売人"><p style="font-style:italic">コスト:なし</p>「小さい進歩」か「小さい/大きい進歩」のアクションのたびに、食料1を払えばもう1回このアクションをできる。</div>\
<div id="ja-text-180" title="180. 小さい庭師"><p style="font-style:italic">コスト:なし</p>このカードを出したときに野菜1を得る。さらに空いている畑があればこの野菜を植えることができる。</div>\
<div id="ja-text-181" title="181. コック"><p style="font-style:italic">コスト:なし</p>収穫で食糧供給フェイズのたびに、食糧2を食べる家族は2人だけになり、残りの家族は全員食料1で満足する。</div>\
<div id="ja-text-182" title="182. 炭焼き"><p style="font-style:italic">コスト:なし</p>自分か他の人がパンを焼く進歩（パン○）を行うたびに食料1と木材1を得る。（パンが焼かれる度ではなく、該当する進歩カードが場に出た瞬間）</div>\
<div id="ja-text-183" title="183. かご編み"><p style="font-style:italic">コスト:なし</p>収穫のたび、葦1（最大１つまで）を食料3にできる。</div>\
<div id="ja-text-184" title="184. 小売人"><p style="font-style:italic">コスト:なし</p>このカードの上に下から野菜・葦・レンガ・木材・野菜・石材・小麦・葦を1つずつ順番に重ねる。食料1でいつでも一番上の商品を買える。</div>\
<div id="ja-text-185" title="185. レンガ焼き"><p style="font-style:italic">コスト:なし</p>いつでもレンガを石材にできる。レンガ2につき石材1、レンガ3につき石材2に換える。</div>\
<div id="ja-text-186" title="186. レンガ屋"><p style="font-style:italic">コスト:なし</p>いつでもレンガ2を羊1か葦1に、レンガ3を猪1か石材1に、レンガ4を牛1にできる。</div>\
<div id="ja-text-187" title="187. レンガ運び"><p style="font-style:italic">コスト:なし</p>ラウンド6-14のうちまだ始まっていないラウンドのスペースに、1つずつレンガを置く。これらのラウンドのはじめにそのレンガを得る。</div>\
<div id="ja-text-188" title="188. レンガ混ぜ"><p style="font-style:italic">コスト:なし</p>アクションでレンガだけを取るたびに、レンガ2を追加で得る。</div>\
<div id="ja-text-189" title="189. 君主"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に、各カテゴリーで4点まで到達すれば、それぞれ1点のボーナスを得る。（柵で囲まれた厩を4つ以上作った場合も含む）</div>\
<div id="ja-text-190" title="190. メイド"><p style="font-style:italic">コスト:なし</p>レンガの家に住み次第、それ以降のラウンドのスペースに食料1を置く。これらのラウンドの最初にその食料を得る。（すでにレンガか石の家に住んでいれば、すぐに食料を置く）</div>\
<div id="ja-text-191" title="191. 左官屋"><p style="font-style:italic">コスト:なし</p>石の家が4部屋以上になったら、1回だけ好きなときに1部屋を無料で増築できる。</div>\
<div id="ja-text-192" title="192. パトロン"><p style="font-style:italic">コスト:なし</p>これ以降職業を出すたびに、食料2を得る。この食料は今出した職業のコストの支払いに当てても良い。</div>\
<div id="ja-text-193" title="193. 牧師"><p style="font-style:italic">コスト:なし</p>このカードを出したときか、それ以降に、家の広さが2部屋しかないのが自分だけである場合、1度だけ木材3・レンガ2・葦1・石材1を得る。</div>\
<div id="ja-text-194" title="194. 鋤職人"><p style="font-style:italic">コスト:なし</p>石の家を持つと、毎ラウンドのはじめに食料1を払って畑を最大1つ耕すことができる。</div>\
<div id="ja-text-195" title="195. 鋤鍛冶"><p style="font-style:italic">コスト:なし</p>「畑を耕す」か「畑を耕して種をまく」のアクションのたびに、食料1で耕す畑を1つ（最大１つまで）追加できる。</div>\
<div id="ja-text-196" title="196. キノコ探し"><p style="font-style:italic">コスト:なし</p>アクションスペースにある木材を取るたび、その中から1つ取らずに残して代わりに食料2を得ることができる。</div>\
<div id="ja-text-197" title="197. ほら吹き"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に、自分の前にある進歩カード5/6/7/8/9枚に対して、それぞれ1/3/5/7/9点ボーナスを得る。</div>\
<div id="ja-text-198" title="198. ネズミ捕り"><p style="font-style:italic">コスト:なし</p>ラウンド10・12に他の人は全員、新しい家族のうち1人を置くことが出来ない。このカードは9ラウンド終了時までにしか出せない。（「新しい家族」とは3-5番目の家族の事を指す）</div>\
<div id="ja-text-199" title="199. 改築屋"><p style="font-style:italic">コスト:なし</p>レンガの家に改築するときレンガが2つ少なくてよい。石の家に改築するとき石材が2つ少なくてよい。</div>\
<div id="ja-text-200" title="200. 修理屋"><p style="font-style:italic">コスト:なし</p>木の家をレンガの家にせず、直接石の家に改築できる。</div>\
<div id="ja-text-201" title="201. 牛使い"><p style="font-style:italic">コスト:なし</p>現在のラウンドに5と9を足す。そのラウンドのスペースにそれぞれ牛を1つずつ置き、そのラウンドのはじめにその牛を得る。</div>\
<div id="ja-text-202" title="202. 季節労働者"><p style="font-style:italic">コスト:なし</p>「日雇い労働者」のアクションのたびに追加で小麦1を得る。ラウンド6からは小麦1でなく野菜1にしてもよい。</div>\
<div id="ja-text-203" title="203. 羊飼い"><p style="font-style:italic">コスト:なし</p>収穫で繁殖フェイズのたびに、羊4頭以上あれば、子羊1頭ではなく2頭得る。ただし子羊のための場所が必要。</div>\
<div id="ja-text-204" title="204. 羊飼い親方"><p style="font-style:italic">コスト:なし</p>これ以降の3ラウンドのスペースにそれぞれ羊1を置く。これらのラウンドのはじめにその羊を得る。</div>\
<div id="ja-text-205" title="205. 葦集め"><p style="font-style:italic">コスト:なし</p>これ以降の4ラウンドのスペースに葦を1つずつ置く。これらのラウンドのはじめにその葦を得る。</div>\
<div id="ja-text-206" title="206. ブタ飼い"><p style="font-style:italic">コスト:なし</p>「猪1」のアクションのたびに、猪をもう1頭得る。</div>\
<div id="ja-text-207" title="207. 厩番"><p style="font-style:italic">コスト:なし</p>柵を1つ以上置くたびに無料で厩を1つ手に入れすぐに置く。（置く場所は柵の内側でも外側でもよい）</div>\
<div id="ja-text-208" title="208. 厩作り"><p style="font-style:italic">コスト:なし</p>柵で囲んでいない厩に、同じ家畜を3匹まで置くことが出来る。</div>\
<div id="ja-text-209" title="209. 石持ち"><p style="font-style:italic">コスト:なし</p>いつでも石材を食料にできる。石材1につき食料2。</div>\
<div id="ja-text-210" title="210. 石運び"><p style="font-style:italic">コスト:なし</p>アクションで石材を取るたびに追加でもう1つ得る。石材以外も取るときは、追加の石材を得るのに食料1を払う。</div>\
<div id="ja-text-211" title="211. 石切り"><p style="font-style:italic">コスト:なし</p>大小の進歩・増築・改築全部が石材1安くなる。</div>\
<div id="ja-text-212" title="212. 踊り手"><p style="font-style:italic">コスト:なし</p>「小劇場」のアクションのたびに、食料が1-3しか置いてなくても食料4を得る。</div>\
<div id="ja-text-213" title="213. 家畜の世話人"><p style="font-style:italic">コスト:なし</p>2つ目の厩を建てると牛1、3つ目の厩で猪1、4つ目の厩で羊1を得る。（1度にいくつも建てた場合、その分だけ家畜を得る）</div>\
<div id="ja-text-214" title="214. 陶工"><p style="font-style:italic">コスト:なし</p>収穫で、毎回レンガ最大1を食料2にできる。</div>\
<div id="ja-text-215" title="215. 家畜小作人"><p style="font-style:italic">コスト:なし</p>羊、豚、牛を各1頭ずつすぐにストックから借りる。得点計算の前に各1頭ずつ返す。返さなかった家畜1頭につき1点を失う。</div>\
<div id="ja-text-216" title="216. 家畜守"><p style="font-style:italic">コスト:なし</p>同じ牧場の中に羊・猪・牛を飼える。自分の牧場全てに適用する。（ただし森の牧場を除く）</div>\
<div id="ja-text-217" title="217. 代官"><p style="font-style:italic">コスト:なし</p>カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に職業を一番多く持っている人は全員3点ボーナスを得る。</div>\
<div id="ja-text-218" title="218. 大工"><p style="font-style:italic">コスト:なし</p>家の資材3と葦2で増築できる。</div>\
<div id="ja-text-219" title="219. 畑農"><p style="font-style:italic">コスト:なし</p>種をまくときに畑を1つだけにすると、その畑に小麦か野菜を追加で2つ置く。畑を2つにすると、小麦か野菜を追加で1つ置く。</div>\
<div id="ja-text-220" title="220. 井戸掘り"><p style="font-style:italic">コスト:なし</p>「井戸」は大きな進歩ではなく小さな進歩になり石材1と木材1だけで作ることができる。</div>\
<div id="ja-text-221" title="221. 村の長老"><p style="font-style:italic">コスト:なし</p>カードを出した時点で残りラウンド数が1/3/6/9ラウンドならばすぐに、それぞれ木材1/2/3/4を得る。ゲーム終了時に進歩を一番多く出している人は全員3点ボーナスを得る。</div>\
<div id="ja-text-222" title="222. 成り上がり"><p style="font-style:italic">コスト:なし</p>1番にレンガの家や石の家に改築したらそれぞれ石材3を得る。2番目なら石材2、3番目なら石材1を得る。（カードを出す前に効果は遡らない）</div>\
<div id="ja-text-223" title="223. 収穫手伝い"><p style="font-style:italic">コスト:なし</p>収穫のたび、食糧供給フェイズのはじめに誰か1人の畑1つから小麦1をとれる。相手は代わりに食料2をストックからとれる。</div>\
<div id="ja-text-224" title="224. 畑作人"><p style="font-style:italic">コスト:なし</p>他の人が種をまくたびに3人ゲームでは小麦1、それ以外は食料1を得る。</div>\
<div id="ja-text-225" title="225. 畑番"><p style="font-style:italic">コスト:なし</p>「小麦1を取る」のアクションのたびに追加で畑を最大1つ耕せる。</div>\
<div id="ja-text-226" title="226. 庭師"><p style="font-style:italic">コスト:なし</p>野菜畑から収穫するたびに、野菜を畑からではなくストックから取る。畑の野菜はそのままにしておく。</div>\
<div id="ja-text-227" title="227. 共同体長"><p style="font-style:italic">コスト:なし</p>残りラウンド数が1/3/6/9ならば、すぐに木材1/2/3/4を得る。ラウンド14で5人以上の家族をアクションに使った人は全員、ゲーム終了時にボーナス3点を得る。（ゲスト、葦の家の住人も数える）</div>\
<div id="ja-text-228" title="228. 商人"><p style="font-style:italic">コスト:なし</p>「スタートプレイヤー」のアクションを選ぶたび、小さい進歩の後にもう一度小さい/大きい進歩ができる。</div>\
<div id="ja-text-229" title="229. ごますり"><p style="font-style:italic">コスト:なし</p>「小麦1を取る」のアクションを行う人から前もって食料1をもらう。さらにストックから食料1を得る。自分が得るときもストックから追加で食料1を得る。</div>\
<div id="ja-text-230" title="230. 穴掘り"><p style="font-style:italic">コスト:なし</p>3人ゲームから「レンガ1」を追加する。その上にすぐにレンガ3を置き、各ラウンドのはじめにレンガ1をその上に置く。このアクションを使う人から食料3をもらう。</div>\
<div id="ja-text-231" title="231. 召使"><p style="font-style:italic">コスト:なし</p>石の家に住んだら、すぐこれ以降のラウンドスペース全てに食料を3つずつ置く。これらのラウンドのはじめにその食料を得る。（カードを出したときすでに石の家に住んでいたらすぐ食料を並べる）</div>\
<div id="ja-text-232" title="232. 産婆"><p style="font-style:italic">コスト:なし</p>他の人が家族を増やすたび、その家族が自分より多いとストックから食料1を得る。2人以上多ければ食料2を得る。</div>\
<div id="ja-text-233" title="233. 農場管理"><p style="font-style:italic">コスト:なし</p>レンガか石の家に住み次第、次に増やす家族1人は部屋がいらなくなる。（それ以降の家族は通常通り）</div>\
<div id="ja-text-234" title="234. 材木買い付け人"><p style="font-style:italic">コスト:なし</p>他の人がアクションで木材を取るたびに（同意無しに）木材1を食料1（最大1つまで）で買い取れる。</div>\
<div id="ja-text-235" title="235. 木材集め"><p style="font-style:italic">コスト:なし</p>これ以降の5ラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。</div>\
<div id="ja-text-236" title="236. 小作人"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に未使用の土地スペース1つにつき食料1を支払えばマイナス点にならない。</div>\
<div id="ja-text-237" title="237. 旅芸人"><p style="font-style:italic">コスト:なし</p>「小劇場」のアクションのたびにおいてある食料の2倍を得る。ただし曲芸師・猛獣使い・奇術師・昔語り・人形使い・街頭の音楽家・踊り手・魔術使いがいればそれぞれ食料1ずつ与えなければならない。</div>\
<div id="ja-text-238" title="238. 収入役"><p style="font-style:italic">コスト:なし</p>ラウンド11から、自分だけそれ以降のラウンドで使うラウンドカードのアクションも選べる。これらのカードは早くともラウンド11のはじめから表にしてボード上に置かれる。</div>\
<div id="ja-text-239" title="239. 脱穀職人"><p style="font-style:italic">コスト:なし</p>いつでも小麦１を食料3にできる。他の人は食料2を出してその小麦を買取りこの行動を無効にできる。複数名乗り出たら選んでよい。</div>\
<div id="ja-text-240" title="240. 牛の飼育士"><p style="font-style:italic">コスト:なし</p>「牛1」のアクションのたびに追加で牛1を得る。</div>\
<div id="ja-text-241" title="241. レンガ積み"><p style="font-style:italic">コスト:なし</p>木の家をレンガの家に改築するコストはレンガ1と葦1でよい。またレンガの家の増築は1部屋につきレンガ3と葦2になる。</div>\
<div id="ja-text-242" title="242. レンガ大工"><p style="font-style:italic">コスト:なし</p>レンガの家に住んだらすぐにこれ以降の5ラウンドのスペースにレンガを2つずつ置く。これらのラウンドのはじめにそのレンガを得る。（カードを出したときすでにレンガや石の家に住んでいたらすぐレンガを並べる）</div>\
<div id="ja-text-243" title="243. レンガ貼り"><p style="font-style:italic">コスト:なし</p>進歩と改築はレンガ1つ少なくできる。さらに増築はレンガ2つ少なくできる。</div>\
<div id="ja-text-244" title="244. 居候"><p style="font-style:italic">コスト:なし</p>このカードを出した次の収穫を完全にスキップする。</div>\
<div id="ja-text-245" title="245. てき屋"><p style="font-style:italic">コスト:なし</p>「小麦1を取る」のアクションのたびに追加で小麦1と野菜1を得ることができる。そのとき他の人は全員、小麦1をストックから得る。</div>\
<div id="ja-text-246" title="246. 乳搾り"><p style="font-style:italic">コスト:なし</p>収穫のたび、畑フェイズで牛1/3/5頭がいれば、それぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につき1点ボーナスを得る。</div>\
<div id="ja-text-247" title="247. 精肉屋"><p style="font-style:italic">コスト:なし</p>いつでも家畜を以下の割合で食料にできる。羊：1　猪：2　牛：3</div>\
<div id="ja-text-248" title="248. 網漁師"><p style="font-style:italic">コスト:なし</p>葦を取るアクションのたび、帰宅フェイズで「漁」のアクションスペースにある食料を全部取る。</div>\
<div id="ja-text-249" title="249. 人形使い"><p style="font-style:italic">コスト:なし</p>他の人が「小劇場」のアクションを行うたびに食料1を払って職業1を出せる。</div>\
<div id="ja-text-250" title="250. 羊使い"><p style="font-style:italic">コスト:なし</p>現在のラウンドに4・7・9・11を足す。そのラウンドにそれぞれ羊を1つずつ置き、ラウンドはじめにその羊を得る。</div>\
<div id="ja-text-251" title="251. 葦買い付け人"><p style="font-style:italic">コスト:なし</p>毎ラウンド、最初に葦をとった人に食料最大1を支払い葦1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。</div>\
<div id="ja-text-252" title="252. 猪飼い"><p style="font-style:italic">コスト:なし</p>置ける場所があればラウンド12の最後でも猪が繁殖する。このカードを出したらすぐに猪1を得る。</div>\
<div id="ja-text-253" title="253. 猪猟師"><p style="font-style:italic">コスト:なし</p>アクションで木材を取るたびに、その中から2つ残して代わりに猪1を得る。</div>\
<div id="ja-text-254" title="254. 馬手"><p style="font-style:italic">コスト:なし</p>石の家に住み次第、毎ラウンドのはじめに厩のアクションに家族を置かずに木材1で厩1（最大1つまで）を建てられる。</div>\
<div id="ja-text-255" title="255. 石買い付け人"><p style="font-style:italic">コスト:なし</p>毎ラウンド、最初に石材をとった人に食料最大1を支払い石材1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。</div>\
<div id="ja-text-256" title="256. 石工"><p style="font-style:italic">コスト:なし</p>収穫のたび、石材1（最大１つまで）を食料3にできる。</div>\
<div id="ja-text-257" title="257. 街頭の音楽家"><p style="font-style:italic">コスト:なし</p>他の人が「小劇場」のアクションを行うたびに、小麦1を得る。</div>\
<div id="ja-text-258" title="258. 家具職人"><p style="font-style:italic">コスト:なし</p>収穫のたび、木材最大1を食料2にできる。</div>\
<div id="ja-text-259" title="259. 家畜追い"><p style="font-style:italic">コスト:なし</p>「羊1」「猪1」「牛1」のアクションを行うたび、食料1を払って同じ種類の家畜をもう1頭得ることができる。</div>\
<div id="ja-text-260" title="260. 毒見役"><p style="font-style:italic">コスト:なし</p>他の人がスタートプレイヤーのたび、ラウンドのはじめにその人に食料1を払えば最初に家族を1人置ける。その後スタートプレイヤーから通常通りに置く。</div>\
<div id="ja-text-261" title="261. 乗馬従者"><p style="font-style:italic">コスト:なし</p>今出たばかりのラウンドカードのアクションを行うたびに追加で小麦1を得る。</div>\
<div id="ja-text-262" title="262. 水運び"><p style="font-style:italic">コスト:なし</p>誰かが大きい進歩の「井戸」を作ったら、それ以降のラウンドのスペース全てに1つずつ食料を置く。それらのラウンドの最初にその食料を得る。（すでに井戸ができていたらすぐに食料を並べる）</div>\
<div id="ja-text-263" title="263. 柵立て"><p style="font-style:italic">コスト:なし</p>このカードを出したら自分の柵を1本好きなアクションに置く。自分がそのアクションを選ぶたび、追加で柵を置くアクションもできる。</div>\
<div id="ja-text-264" title="264. 柵作り"><p style="font-style:italic">コスト:なし</p>他の人が柵を1-4本立てるたびストックから木材1を得る。5本以上立てれば木材2を得る。</div>\
<div id="ja-text-265" title="265. 柵運び"><p style="font-style:italic">コスト:なし</p>現在のラウンドに6と10を足す。そのラウンドのスペースそれぞれに自分の柵を4本ずつ置き、ラウンドのはじめに食料2を払って4本全部を立てることができる。（木材は払わなくて良い）</div>\
<div id="ja-text-266" title="266. 畑好き"><p style="font-style:italic">コスト:なし</p>「種をまいてパンを焼く」のアクションのたびにアクションの前に小麦1を得る。あるいは手持ちの小麦1を野菜1と交換できる。</div>\
<div id="ja-text-267" title="267. 養父母"><p style="font-style:italic">コスト:なし</p>食料1を払えば増やしたばかりの新しい家族でアクションができる。その場合、新しい家族は新生児には含めない。</div>\
<div id="ja-text-268" title="268. 出来高労働者"><p style="font-style:italic">コスト:なし</p>アクションで木材・レンガ・葦・石材・小麦のいずれかを手に入れるたびに、食料1で同じものをもう1つ買える。野菜の場合は食料2で買える。</div>\
<div id="ja-text-269" title="269. 曲芸師"><p style="font-style:italic">コスト:なし</p>「小劇場」のアクションのたび、他の人全員が家族を置き終わったあとで、小劇場に置いた家族を「畑1を耕す」か「小麦1を取る」か「畑1を耕して種をまく」のアクションのいずれかに（空いていれば）移動してそのアクションを行うことができる。</div>\
<div id="ja-text-270" title="270. 乳母"><p style="font-style:italic">コスト:なし</p>増築のとき、増築した部屋の数だけすぐに家族を増やせる。家族1人につき食料1を払う。（新生児は次のラウンドになってからアクションに使える。増築した後に部屋のなかった家族がいれば移して、それでもなお空き部屋がある場合のみ有効）</div>\
<div id="ja-text-271" title="271. 職業訓練士"><p style="font-style:italic">コスト:なし</p>他の人が職業を出すたびに、食料3を払えば自分も職業1を出せる。4枚目以降の職業は食料2だけでよい。</div>\
<div id="ja-text-272" title="272. 梁打ち"><p style="font-style:italic">コスト:なし</p>改築でレンガ1や石材1（最大1）を木材1で代用できる。増築ではレンガ2や石材2（最大2）を木材1で代用できる。</div>\
<div id="ja-text-273" title="273. 骨細工"><p style="font-style:italic">コスト:なし</p>食料にした猪1頭につき自分の木材2までをこのカードの上に置ける。1･4･7･10番目の木材を除きこのカードの上にある木材1につき1点のボーナスを得る。</div>\
<div id="ja-text-274" title="274. 有機農業者"><p style="font-style:italic">コスト:なし</p>ゲーム終了時に、家畜が1頭以上いて、かつまだ3頭以上入れられる牧場1つにつき1点のボーナスを得る。（森の牧場も含む）</div>\
<div id="ja-text-275" title="275. ぶらつき学生"><p style="font-style:italic">コスト:なし</p>職業を出すときに、職業カードの手札から誰かに引いてもらって出すことができる。そのたびに食料3を受け取り、その職業を出すのに払ってもよい。</div>\
<div id="ja-text-276" title="276. 村長"><p style="font-style:italic">コスト:なし</p>カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時にマイナス点がない人は全員5点のボーナスを得る。</div>\
<div id="ja-text-277" title="277. 工場主"><p style="font-style:italic">コスト:なし</p>レンガか石の家に住み次第、家具製造所・製陶所・かご製作所は小さい進歩になり好きな資源2つ少なく作ることが出来る。</div>\
<div id="ja-text-278" title="278. 林務官"><p style="font-style:italic">コスト:なし</p>「種をまく」のアクションを行うたびにこのカードの上に木材を3つまで植えられる。小麦畑と同じように扱い、畑フェイズで収穫する。</div>\
<div id="ja-text-279" title="279. 学者"><p style="font-style:italic">コスト:なし</p>石の家に住み次第、毎ラウンドのはじめに食料1で職業カードを出すかコストを払って小進歩カードを出せる。</div>\
<div id="ja-text-280" title="280. 革なめし工"><p style="font-style:italic">コスト:なし</p>食料にした猪と牛をこのカードの上に置く。ゲーム終了時に畜殺した猪が2/4/6頭または牛が2/3/4頭ならばそれぞれ1/2/3点のボーナスを得る。</div>\
<div id="ja-text-281" title="281. 行商人"><p style="font-style:italic">コスト:なし</p>「小さい進歩1」のアクションのたびに、小さい進歩の代わりに大きい進歩ができる。「大きい進歩または小さい進歩1」では小さい進歩を2枚出せる。</div>\
<div id="ja-text-282" title="282. 執事"><p style="font-style:italic">コスト:なし</p>カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に家が一番広い人は全員3点のボーナスを得る。</div>\
<div id="ja-text-283" title="283. 木材運び"><p style="font-style:italic">コスト:なし</p>ラウンド8-14のうち、まだ始まっていないラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。</div>\
<div id="ja-text-284" title="284. 木材配り"><p style="font-style:italic">コスト:なし</p>毎回ラウンドのはじめに「木材3」にある木材をその下の「レンガ1」「葦1」「漁」のマスに同じ数ずつ分けることができる。このカードを出したときに木材2を得る。このカードの効果で木材が配られたアクションスペースは「木材が累積するスペース」とみなす。</div>\
<div id="ja-text-285" title="285. ブリキ職人"><p style="font-style:italic">コスト:なし</p>いつでもレンガを食料にできる。レンガ1につき食料1。誰かが井戸を作ればレンガ2につき食料3にできる。（村の井戸でも可）</div>\
<div id="ja-text-286" title="286. 小農夫"><p style="font-style:italic">コスト:なし</p>家畜2頭分だけの牧場に3頭飼えるようになる。持っている畑が全部で2つ以下なら、種をまくたびに小麦か野菜が1つ増える。</div>\
<div id="ja-text-287" title="287. 倉庫主"><p style="font-style:italic">コスト:なし</p>ラウンドのはじめに石材5以上持っていれば石材1、葦6以上で葦1、レンガ7以上でレンガ1、木材8以上で木材1を得る。</div>\
<div id="ja-text-288" title="288. 倉庫番"><p style="font-style:italic">コスト:なし</p>1つのアクションで葦と石材の両方を取るたびに、追加でレンガ1か小麦1を得る。</div>\
<div id="ja-text-289" title="289. 営農家"><p style="font-style:italic">コスト:なし</p>全員が家族を置いた後、「小麦1を取る」か「野菜1を取る」に家族を置いていれば、「種をまく」か「種をまいてパンを焼く」のアクションのどちらかに（空いていれば）移動してそのアクションを行うことが出来る。</div>\
<div id="ja-text-290" title="290. レンガ職人"><p style="font-style:italic">コスト:なし</p>アクションで木材かレンガを取るたびに、追加でレンガ1を得る。</div>\
<div id="ja-text-291" title="291. 愛人"><p style="font-style:italic">コスト: 4x<img align="absmiddle" src="img/pionPN16.png"></p>このカードを出したらすぐ「家族を増やす（部屋がなくてもよい）」のアクションを行う。このカードを出すのにコストとして追加で食料4が必要。</div>\
<div id="ja-text-292" title="292. 露天商の女"><p style="font-style:italic">コスト:なし</p>アクションや小さい進歩で野菜を取るたびに、追加で小麦2を得る。</div>\
<div id="ja-text-293" title="293. 鋤手"><p style="font-style:italic">コスト:なし</p>現在のラウンドに4・7・10を足す。そのラウンドのスペースにそれぞれ畑を1つずつ置き、これらのラウンドのはじめに食料1を払えばその畑を自分の農場における。</div>\
<div id="ja-text-294" title="294. 柴結び"><p style="font-style:italic">コスト:なし</p>改築と増築で必要な葦を木材1で代用できる。</div>\
<div id="ja-text-295" title="295. 牛飼い"><p style="font-style:italic">コスト:なし</p>場所があればラウンド12の後にも牛が繁殖する。このカードを出したらすぐ牛1を得る。</div>\
<div id="ja-text-296" title="296. 種屋"><p style="font-style:italic">コスト:なし</p>「小麦1を取る」のアクションで追加で小麦1を取る。このカードを出したとき小麦1を得る。</div>\
<div id="ja-text-297" title="297. 羊番"><p style="font-style:italic">コスト:なし</p>石の家に住み次第これ以降のラウンドのスペースに羊を1頭ずつ置く。これらのラウンドのはじめにその羊を得る。（カードを出したときすでに石の家ならばすぐに羊を置く）</div>\
<div id="ja-text-298" title="298. 羊農"><p style="font-style:italic">コスト:なし</p>アクションで羊を取るたびに、追加で羊1をストックから得る。いつでも（繁殖フェイズを除く）羊3を牛1と猪1に交換できる。</div>\
<div id="ja-text-299" title="299. 畜殺人"><p style="font-style:italic">コスト:なし</p>他の人が家畜を食料にするたびに、（食料にした頭数にかかわらず）食料1をストックから得る。食糧供給フェイズでは手番を最後に行う。</div>\
<div id="ja-text-300" title="300. 火酒作り"><p style="font-style:italic">コスト:なし</p>収穫で食糧供給フェイズのたびに、野菜最大1を食料5にできる。</div>\
<div id="ja-text-301" title="301. 彫刻家"><p style="font-style:italic">コスト:なし</p>進歩1・木の家の増築1・厩・柵のいずれかで、1ラウンドに1回、払う木材を1つ少なくできる。</div>\
<div id="ja-text-302" title="302. 猪使い"><p style="font-style:italic">コスト:なし</p>現在のラウンドに4･7･10を足す。そのラウンドのスペースにそれぞれ猪1ずつ置き、ラウンドのはじめにその猪を得る。</div>\
<div id="ja-text-303" title="303. 石打ち"><p style="font-style:italic">コスト:なし</p>「改築」のアクションなしで、いつでもレンガの家を石の家に改築できる。（ただし資材は払う）</div>\
<div id="ja-text-304" title="304. 獣医"><p style="font-style:italic">コスト:なし</p>このカードを出したとき白いマーカー4、黒いマーカー3、茶色のマーカー2を取って袋の中に入れる。各ラウンドのはじめに2つ引く。同じなら1つを袋に戻して、同じ色の家畜を1頭得る。同じでなければ2つとも袋に戻す。</div>\
<div id="ja-text-305" title="305. 家畜主"><p style="font-style:italic">コスト:なし</p>まだ始まっていなければラウンド7に羊1、ラウンド10に猪1、ラウンド14に牛1を置く。これらのラウンドのはじめに食料1でその家畜を買える。</div>\
<div id="ja-text-306" title="306. 調教師"><p style="font-style:italic">コスト:なし</p>自分の家のどの部屋にも家畜を1頭ずつ置ける。種類が別でも良い。</div>\
<div id="ja-text-307" title="307. 家畜飼い"><p style="font-style:italic">コスト:なし</p>未使用の土地から新しい牧場を作るたびに、以下のコストで家畜のつがいを1組買える。羊2頭は食料1、猪2頭は食料2、牛2頭は食料3。</div>\
<div id="ja-text-308" title="308. 職場長"><p style="font-style:italic">コスト:なし</p>毎ラウンド、労働フェイズのはじめに共通のストックから食料1を取り、好きなアクションスペースに置く。</div>\
<div id="ja-text-309" title="309. 織工"><p style="font-style:italic">コスト:なし</p>毎ラウンド、労働フェイズのはじめに羊2頭以上持っていれば、食料1を得る。</div>\
<div id="ja-text-310" title="310. 資材商人"><p style="font-style:italic">コスト:なし</p>このカードの上に下から石材・レンガ・石材・レンガ・葦・レンガ・木材を1つずつ順番に重ねる。一番上の品と同じものを他で取るたびに、一番上の品も得る。</div>\
<div id="ja-text-311" title="311. 魔術使い"><p style="font-style:italic">コスト:なし</p>自分の家族の最後の1人を「小劇場」のアクションに置くたびに、追加で小麦1と食料1を得る。</div>\
<div id="ja-text-312" title="312. 柵見張り"><p style="font-style:italic">コスト:なし</p>毎ラウンド1回だけ、建てた厩1つまでを即座に食料1を払うことで柵で囲み、1スペースの牧場にできる。柵のコストの木材は払わなくて良い。これは未使用スペースが牧場になったものとみなす。</div>\
<div id="ja-text-313" title="313. title313"><p style="font-style:italic">コスト:なし</p>Once you live in a clay hut or stone house, wheneveryou use a person’s action to take wood you canpay 1 food to also plow 1 field.<br>* This is a plough.<br>* Is activated when you use an action space onwhich wood is placed each round. You cannotuse such an action space just to use this card ifthe action space contains no wood (e.g. becauseof the Wood Distributor K284).<br>* Is activated even if you leave all the wood on theaction space because of Basket E34, MushroomCollector E196, or Pig Catcher I253.<br>* Is activated when you use an action space thatcontains wood because of the Wood Distributor.<br>* Is also activated by the action space “1 Reed,Stone, and Wood” in 5-player games, and the actionspace “Take 1 Building Resource” in 3-playergames if you take wood.<br>* Is not activated when you receive wood becauseof a minor improvement or occupation.</div>\
<div id="ja-text-314" title="314. title314"><p style="font-style:italic">コスト:なし</p>Once all the people have been placed in this round,you may place a guest marker to carry out an additionalaction. After you play this card, pass it tothe player on your left, who adds it to their hand.<br>* The guest is played after all family members,other guests, and the occupant of the Reed HutK138, but before moving a person (e.g. becauseof the Countryman K289 or Acrobat K269).<br>* The action performed by a guest counts for theChurch Warden I227.<br>* The guest does not need to be fed during harvesttime.<br>* This card is passed to the left immediately whenit has been played. The next player may use theKeg the same round.<br>* In a solo game, this card is removed from thegame after you play it.</div>\
<div id="ja-text-315" title="315. title315"><p style="font-style:italic">コスト:なし</p>During the feeding phase of each harvest, you canuse the Brewer’s Copper to convert at most 1 grainto 2 food. At the end of the game, you receive 1bonus point if you have at least 7 grain.<br>* Using the Brewer’s Copper does not count asbaking.</div>\
<div id="ja-text-316" title="316. title316"><p style="font-style:italic">コスト:なし</p>This card cannot be played once all other playershave 2 or more occupations (3 occupations in a 3-player game, 4 occupations in a 2-player game).<br>* In a 1-player game, you can always play thiscard.</div>\
<div id="ja-text-317" title="317. title317"><p style="font-style:italic">コスト:なし</p>Pay 2 food for each of your family members, andreceive a total of 4 bonus points. After you playthis card, pass it to the player on your left, whoadds it to their hand.<br>* Write the bonus points on the scoring pad.<br>* You do not have to pay for guests or the occupantof the Reed Hut K138.<br>* In a solo game, this card is removed from thegame after you play it.</div>\
<div id="ja-text-318" title="318. title318"><p style="font-style:italic">コスト:なし</p>When you play this card, you can convert as manyanimals to food as you have family members. Foreach sheep, you receive 3 food; for each wild boar,4; and for each cattle, 5. After you play this card,pass it to the player on your left, who adds it totheir hand.<br>* You do not need a cooking improvement to convertthe animals to food.<br>* Is not a cooking improvement.<br>* Guests or the occupant of the Reed Hut K138do not count as family members.<br>* You may choose to convert fewer animals to foodthan you have family members.<br>* In a solo game, this card is removed from thegame after you play it.</div>\
<div id="ja-text-319" title="319. title319"><p style="font-style:italic">コスト:なし</p>Three times during the game (but at most onceper round), you can place 1 vegetable from yourpersonal supply on this card and receive 3 food inexchange. The vegetables on this card are countedin the scoring at the end of the game.<br>* You do not need a cooking improvement to exchangethe vegetable for food.<br>* A harvest counts as part of the preceding round.<br>* Placing a vegetable on this card does not countas sowing.<br>* The vegetables on this card are not consideredto be in your personal supply.<br>* The Bean Field E18, Lettuce Patch E47, andTurnip Field K137 count as prerequisites for thePumpkin Seed Oil, if there are vegetable markerson those cards.<br>* The Grocer E184 do not count as prerequisites.<br>* Placing a vegetable on this card does not activatethe Spices E25.</div>\
<div id="ja-text-320" title="320. title320"><p style="font-style:italic">コスト:なし</p>Play this card before the end of round 4. Whenyou play this card, place one of your unbuilt fencesupright on an unused farmyard space. If you havenot knocked it over by the end of the game, it isworth 2 bonus points.<br>* The farmyard space counts as used, even if thefence is knocked over, in which case, it remainson the farmyard space. You cannot reclaim it foruse as a fence.<br>* The farmyard space cannot be used for anythingelse until the end of the game. In the scoring atthe end of the game, the farmyard space countsas used, even if the fence has been knocked over.<br>* If another player knocks the fence over, you canre-place it.<br>* Placing the Maypole does not count as buildingfences.<br>* You cannot play this card after round 4, or afteryou’ve built all of your fences.</div>\
<div id="ja-text-321" title="321. title321"><p style="font-style:italic">コスト:なし</p>For each round that has not yet begun when youplay this card, you receive 1 bonus point and 2 food.<br>* Write down the bonus point(s) on the scoring padimmediately.</div>\
<div id="ja-text-322" title="322. title322"><p style="font-style:italic">コスト:なし</p>As long as you have at least 1 cattle in your farm,you can knock down your fences and rebuild themat any time, for no cost.<br>* Your animals do not run away.<br>* Fences must always be placed according to therules.<br>* Rebuilding fences does not activate the AnimalBreeder K307, Hedge Keeper E175, FarmerE160, Stablehand E207, and Shepherd’s CrookI77, or another player’s Fencer I264.<br>* When you rebuild the fences, you must use thesame number of fences. You may not removefences from your farm.</div>\
<div id="ja-text-323" title="323. title323"><p style="font-style:italic">コスト:なし</p>Place 1 vegetable from your own supply on thiscard. At any time, you can harvest this vegetableand convert it to food. If it is still on the card atthe end of the game, you receive 2 bonus points.<br>* You can count the vegetable in scoring at the endof the game.<br>* You have to place the vegetable immediatelywhen you play the Giant Pumpkin; you cannotplay this card if you do not have a vegetable.<br>* You may not place another vegetable on this cardafter you have harvested the first.<br>* When you harvest the vegetable, you have toconvert it to food immediately. You may not addit to your supply or sow it.<br>* The Giant Pumpkin does not count as a field,and is not harvested during the field phase of aharvest. You cannot use the Gardener I226 forthe Giant Pumpkin.</div>\
<div id="ja-text-324" title="324. title324"><p style="font-style:italic">コスト:なし</p>Whenever you sow, you can pay 1 wood and sow 2grain instead of 1 on an empty field.<br>* You can use this card once for every sowingaction.<br>* You may not sow an extra stack of grain on afield that is not empty.<br>* If you also have the Planter Box I90, LiquidManure K118, Fieldsman I219, or SmallholderK286, you may add extra grain to both stackswhen you sow. The field for which you use theScarecrow counts as 2 fields for the Fieldsmanand Smallholder.<br>* In each harvest, you take one grain from each ofthe stacks.<br>* The Bean Field E18, Lettuce Patch E47, andTurnip Field K137 count as prerequisites for theScarecrow, if there are no vegetables on them.The Acreage K105 counts as two empty fields ifthere are no markers on it, and as one empty fieldif there is one field planted on it.<br>* The Copse I78, Forester K278 do not count asprerequisites.<br>* You cannot use the Scarecrow to sow extra grainon the Acreage, or extra goods on the Copse,Forester, or Vineyard.<br>* Fields that have two stacks of grain on themcount as two fields for prerequisites. They countas 1 field during the final scoring.<br>* When both stacks of grain have been completelyharvested, you can only sow 1 grain on the fieldwith your next sowing action, unless you use theScarecrow again for that field.</div>\
<div id="ja-text-325" title="325. title325"><p style="font-style:italic">コスト:なし</p>At any time, you can pay 3 food to take a familygrowth action without placing one of your people.You must have room in your home. You can use thenewborn to take actions from the following round.<br>* Activates the Farm Steward I233, and Adoptive Parents K267 whenused.<br>* Does not activate the Clapper K127.<br>* If you use the Village Beauty during the harvestafter feeding your family, the new family memberremains a newborn for the entire followinground.</div>\
<div id="ja-text-326" title="326. title326"><p style="font-style:italic">コスト:なし</p>Whenever you manage to be the very last playerto place a person in any round, you receive 1 foodafter you take the final action. If you play this occupationwith the last person to be placed duringthe current round, you receive 2 food.<br>* If a player moves a person at the end of a round,e.g. because of the Countryman K289 or AcrobatK269, that does not count as the last personplaced.</div>\
<div id="ja-text-327" title="327. title327"><p style="font-style:italic">コスト:なし</p>At any time, you may look at all the remaining unplacedround cards and re-sort them. When youplay this card, you receive 2 wood.<br>* When re-sorting, the round cards must remain inthe appropriate game stage.</div>\
<div id="ja-text-328" title="328. title328"><p style="font-style:italic">コスト:なし</p>Whenever you or another player receives 3 food ormore on an action space, you receive 1 food fromthe general supply.<br>* The amount of food is counted without takingany improvements or occupations into account.The Cooper can only be activated by an actionspace that has at least 3 food on it: only the actionspace “Fishing”, an action space with “Travelingplayers”, or an action on which the ForemanK308 has placed enough food.<br>* Is not activated by using the Net FishermanI248.</div>\
<div id="ja-text-329" title="329. title329"><p style="font-style:italic">コスト:なし</p>From now until the end of the game, the other playersonly receive goods from action spaces when theyreturn their people to their home.<br>* This card applies to goods that are on actionspaces as well as goods that are taken from thesupply, but not to goods that are received fromcards.<br>* “Goods” includes wood, clay, reed, stone, vegetables,grain, and animals.</div>\
<div id="ja-text-330" title="330. title330"><p style="font-style:italic">コスト:なし</p>When you convert animals to food, you can placesome or all of them on this card instead of returningthem to the general supply. The card can holda maximum of 1 sheep, 1 wild boar and 1 cattle.These animals are counted in scoring.<br>* If you place a converted animal on the Taxidermist,you may not use the Basin Maker K273,Tanner K280, or Brush Maker E156 for thesame animal.<br>* If you also have the Pelts K339, you may usethat card as well as the Taxidermist for each convertedanimal.<br>* Animals on this card count for the Loom K146,Milking Stool K133, Estate Manager E170 andMilking Hand I246.</div>\
<div id="ja-text-331" title="331. title331"><p style="font-style:italic">コスト:なし</p>You may immediately sow each vegetable that youreceive outside the harvest phase and would otherwiseplace in your supply.<br>* Is also activated when you receive vegetablesfrom occupations and improvements, e.g. WeeklyMarket I104, Undergardener E166.<br>* Activates the Fieldsman I219 when used. If youget several vegetable at once, and you want tosow more than 1, you have to sow them at thesame time.<br>* Activates the Smallholder K286, Liquid ManureK118, Planter Box I90, Potato Dibber E32, andanother player’s Field Worker I224 when used tosow the vegetable.</div>\
<div id="ja-text-332" title="332. title332"><p style="font-style:italic">コスト:なし</p>Place 2 grain and 2 vegetables on this card. Youmay buy them at any time. Each grain costs 2 food,each vegetable costs 3 food.<br>* Pay the food before receiving the grain orvegetable.</div>\
<div id="ja-text-333" title="333. title333"><p style="font-style:italic">コスト:なし</p>You can exchange 1 wood, 1 clay, 1 reed and 1stone for 2 food and 1 bonus point at any time andas often as you like.<br>* Write down the bonus points on the scoring padimmediately.<br>* You cannot use the Wood Carver K301, StonecutterE211, or Bricklayer I243 to reduce thecosts.</div>\
<div id="ja-text-334" title="334. title334"><p style="font-style:italic">コスト:なし</p>You receive 4 food before you pay the costs of playingthis occupation. You may immediately returnthis card to your hand after you have played it.<br>* When you play this card, you have to decide immediatelyif you want to take it back. If you leaveit on the table, you may not change your mindlater.<br>* If you return this card to your hand, it does notcount as a played occupation, e.g. for minor improvements,when scoring the Reeve E217 or TutorE174, or when determining the costs of playinga subsequent occupation.<br>* If you return this card to your hand, you mayplay it again later. If you also have the WritingDesk E49, you may play the Dance Instructortwo times in the same action.</div>\
<div id="ja-text-335" title="335. title335"><p style="font-style:italic">コスト:なし</p>During the field phase of each harvest, you can exchange1 wood and 1 food for 1 bonus point.<br>* Write down the bonus points on the scoring padimmediately.<br>* You can only use this card once per harvest.</div>\
<div id="ja-text-336" title="336. title336"><p style="font-style:italic">コスト:なし</p>When you have family growth, you can pay 3 foodto bring 2 new family members instead of 1 into thegame. You do not need to have space in your homefor the second new family member.<br>* Using the Wet Nurse K270, Lover K291 activates the Mother of Twins.<br>* Receiving 2 family members with one familygrowth action activates the Clapper K127, MidwifeI232 only once, but Adoptive ParentsK267 twice.</div>\
<div id="ja-text-337" title="337. レンガ置き場"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>このカードは全員が使えるアクションスペースになる。ここを使うと持ち主に食料1を払ってストックからレンガ5を得る。持ち主が使うとレンガ5か2点を得る。 条件: 職業3</div>\
<div id="ja-text-338" title="338. 強力餌"><p style="font-style:italic">コスト:なし</p>収穫で食料供給フェイズのたびに、野菜1（最大1つまで）で自分の農場にいる家畜を1匹増やす。</div>\
<div id="ja-text-339" title="339. 毛皮"><p style="font-style:italic">コスト:なし<br>条件: 3 Occupation(s)</p>食料にして共通のストックに戻した家畜1頭につき、食料1を自分のストックから取って部屋に置く。各部屋1食料ずつ置ける。この食料はもはや使うことができないが、ゲーム終了時にそれぞれボーナス1点に数える。 条件: 職業3</div>\
<div id="ja-text-340" title="340. 農夫"><p style="font-style:italic">コスト:なし</p>毎ラウンドのはじめ（フェイズ1の前）に他の人より農場を多く使用していたら木材1を得る。</div>\
<div id="ja-text-341" title="341. ギルド長"><p style="font-style:italic">コスト:なし</p>家具製作所か家具職人を出すとすぐ木材4を得る。製陶所か陶工を出すとすぐレンガ4を得る。かご製作所かかご編みを出すとすぐ葦3を得る。ギルド長を出したとき、これらのカードをすでに出していれば対応する資材を2つ得る。</div>\
<div id="ja-text-342" title="342. 猛獣使い"><p style="font-style:italic">コスト:なし</p>「小劇場」で取った食料ですぐに家畜を入手できる。羊1頭につき食料2、猪1頭につき食料2、牛1頭につき食料3。</div>\
<div id="ja-text-999" title="999. 物乞い"><p style="font-style:italic">コスト:なし</p>In each harvest, if you can\'t feed your family, you receive a mendicity card for each missing Food.</div>\
');
    }

    function setCardTooltip($targets, cluetip_options) {
        cluetip_options = $.extend({
            multiple: true,
            cluetipClass: 'agricola',
            clickThrough: true,
            cluezIndex: 3000,
            waitImage: false,
            local: true,
            attribute: 'data-jp-text',
            titleAttribute: 'data-jp-title',
            width: 220,
            leftOffset: 220 + 120 + 5,
            cursor: 'pointer',
            showTitle: true
        }, cluetip_options || {});

        $targets.each(function () {
            var selector = '#ja-text-' + getCardNumber($(this).attr('title'))[0];
            if ($(selector).is('*')) {
                $(this).attr({ 'data-jp-text': selector, 'data-jp-title': $(selector).attr('title') })
                    .cluetip(cluetip_options);
            }
        });
    }

    function createCardDesc(cardname) {
        var cardnumber = getCardNumber(cardname)[0];
        return cardJson[cardnumber];
    }

    function createDraftCards() {
        var drafts = $("form[name=fmDraft] div.clCarteMf");
        var cardname = "";
        drafts.each(function(i) {
            $(drafts[i]).hover(function() {
                if (this.title == "") {
                    return;
                }
                $("#active").text(createCardDesc(this.title));
            });
        });
    }

    function hookShowExp() {
        new window.MutationObserver(function(mutations, observer) {
            setCardTooltip($('#dvCartesPosees td.clCarteMf'), { leftOffset: 170 });
        }).observe($('#dvCartesPosees')[0], { childList: true });
    }

    function setAlert() {
        $.get('index.php', { p : "encours" }, function(data) {
            parseIndex(data);
            if (GM_getValue(agrid, false) && !GM_getValue(alerted, false)) {
                AUDIO_LIST["bell"].play();
                alert("It's your turn!");
                GM_setValue(alerted, true);

                location.href = location.href.replace(/#$/, "");
             } else if (!GM_getValue(agrid, false)) {
                GM_setValue(alerted, false);
             }

        });

        setTimeout(setAlert, ajaxmsec);
    }

    function parseIndex(data) {
        $($(data).find(".clLigne1, .clLigne2")).each(function () {
            var $self = $(this);
            var gameid = $self.find('a:first').text();
            var myturn = $self.find('[style*="color"][style*="red"]').is('*');
            GM_setValue(gameid, myturn);
        });
    }

    function setAjaxHistory() {
        $.get('historique.php', { id : agrid }, function(data) {

            var players = getPlayers(data);
            var actions = getActions(data, players);

            if (lastTurn == 0 && actions.length >= 5) {
                lastTurn = actions.length - 5;
            }

            for (i = lastTurn; i < actions.length; i = i + 1) {
                var act = actions[i];
                addAction(act);
            }

            lastTurn = actions.length;
        });

        setTimeout(setAjaxHistory, ajaxmsec);
    }

    function addAction(act) {
        $("#history tbody").prepend("<tr><td style=\"text-align: center;\">" + act.round + "</td><td>" + act.player + "</td><td>" + act.action + "</td></tr>");
    }

    function getPlayers(data) {
        var headers = data.match(/<th .+?<\/th>/g);
        var players = [];
        for (i = 0; i < headers.length; i = i + 1) {
            if (i == 0) {
                continue;
            }
            if (headers[i].match(/div>&nbsp;(.+)<div/)) {
                players[i-1] = RegExp.$1;
            }
        }

        return players;
    }

    function getActions(data, players) {
        var actions = [];
        var rounds = [];
        var round = 0;
        var n = 0;
        var player = 0;
        var act = "";
        var rows = data.match(/<tr .+?<\/tr>/g);
        for (i = 0; i < rows.length; i = i + 1) {
            var datas = rows[i].match(/<td .+?<\/td>/g);
            for (j = 0; j < datas.length; j = j + 1) {

                if (datas.length != players.length && j == 0) {
                    round = round + 1;
                    continue;
                }

                if (datas[j].match("&nbsp;")) {
                    continue;
                }

                player = j;
                if (datas.length != players.length) {
                    player = j - 1;
                }

                if (datas[j].match(/>(\d+)<\/div>(.+)<\/td>/)) {
                    n = RegExp.$1;
                    act = RegExp.$2;

                    actions[Number(n) - 1] = new Action(round, players[player], act);
                }
            }
        }

        return actions;
    }

    function getAgricolaId() {
        return document.location.href.match(/\d+/)[0];
    }

    function getCardNumber(cardname) {
        return cardname.match(/^\d+/);
    }

    function GM_getValue(key, defaultValue)
    {
      var value = window.localStorage.getItem(key);
      if (value != null) {
        return eval(value);
      } else {
        return defaultValue || null;
      }
    }

    function GM_setValue(key, value)
    {
      window.localStorage.setItem(key , value);
    }

    function initializeCardJson() {
        var json = {
            "1" : "1 かまど 以下の品をいつでも食料にできる。野菜：2　羊：2　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2",
            "2" : "2 かまど 以下の品をいつでも食料にできる。野菜：2　羊：2　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2",
            "3" : "3 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3",
            "4" : "4 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3",
            "5" : "5 レンガ暖炉 「パンを焼く」のアクションのたびに、小麦最大1を食料5にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。",
            "6" : "6 石の暖炉 「パンを焼く」のアクションのたびに、小麦最大2までそれぞれ食料4にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。",
            "7" : "7 製陶所 収穫のたびにレンガ最大1を食料2にできる。ゲーム終了時にレンガ3/5/7でそれぞれ1/2/3点のボーナスを得る。",
            "8" : "8 家具製作所 収穫のたびに木材最大1を食料2にできる。ゲーム終了時に木材3/5/7でそれぞれ1/2/3点のボーナスを得る。",
            "9" : "9 かご製作所 収穫のたびに葦最大1を食料3にできる。ゲーム終了時に葦2/4/5でそれぞれ1/2/3点のボーナスを得る。",
            "10" : "10 井戸 これ以降の5ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。",
            "11" : "11 畑 このカードを出したらすぐ畑を最大1つ耕す。 コスト: 食1 移動進歩",
            "12" : "12 釣竿 「漁」のアクションのたびに、追加で食料1を得る。ラウンド8からは追加で食料2を得る。 コスト: 木1",
            "13" : "13 斧 木の家の増築はいつも木材2と葦2でできる。 コスト: 木1・石1",
            "14" : "14 パン焼き暖炉 「パンを焼く」のアクションのたびに、小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 暖炉1枚を返す",
            "15" : "15 パン焼き桶 レンガ暖炉と石の暖炉が小さい進歩になり好きな資材1つ安くなる。木の暖炉も資材1つ安くなる。 コスト: 木1",
            "16" : "16 建築資材 このカードを出したらすぐ木材１かレンガ1を得る。 移動進歩",
            "17" : "17 風車小屋 パンを焼かずにいつでも小麦1を食料2にできる。 コスト: 木3・石1",
            "18" : "18 マメ畑 種まきで、このカードの上に畑と同じように野菜を植えられる。（このカードは得点計算で畑に含めない） 条件: 職業2",
            "19" : "19 三つ足やかん かまど○の進歩で2つの品物を食料にするたびに食料をもう1つ得る。 コスト: レ2",
            "20" : "20 簡易かまど 以下の品をいつでも食料にできる。野菜：2　羊：1　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2 コスト: レ1",
            "21" : "21 木骨の小屋 ゲーム終了時に石の家の広さ1スペースにつき、ボーナス1点を得る。（ヴィラと両方持っている場合、ヴィラのボーナスのみ得る。） コスト: 木1・レ1・葦1・石2",
            "22" : "22 いかだ 「漁」のアクションのたびに追加の食料1か葦1を得る。 コスト: 木2",
            "23" : "23 かいば桶 ゲーム終了時に、牧場の広さの合計が6/7/8/9マス以上で、ボーナス1/2/3/4点を得る。 コスト: 木2",
            "24" : "24 檻 これ以降のラウンドのスペース全部にそれぞれ食料2を置く。これらのラウンドのはじめにその食料を得る。 コスト: 木2 条件: 職業4",
            "25" : "25 スパイス かまど○の進歩カードで野菜を食料にするたびに追加で食料1を得る。",
            "26" : "26 かんな 家具製作所・製材所・家具職人で、木材1を食料に換えると追加で食料1を得る。あるいは木材をもう1つ払って食料2に換えられる。 コスト: 木1",
            "27" : "27 木の暖炉 「パンを焼く」のアクションのたびにいくつでも小麦1つにつき食料3にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 木3・石1",
            "28" : "28 木のスリッパ ゲーム終了時に、レンガの家でボーナス1点、石の家でボーナス2点を得る。 コスト: 木1",
            "29" : "29 角笛 厩の有無に関わらず、羊のいる牧場はそれぞれ追加で2頭まで飼える。柵で囲んでいない厩は羊2頭まで飼える。（この効果は家畜庭、動物園にも適用される） 条件: 羊1",
            "30" : "30 カヌー 「漁」のアクションのたびに、追加で食料1と葦1を得る。 コスト: 木2 条件: 職業2",
            "31" : "31 鯉の池 これ以降の奇数ラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業1・進歩2",
            "32" : "32 じゃがいも掘り 種をまくたびに、野菜を新しく植えた畑全部にもう1つ野菜を置く。 コスト: 木1",
            "33" : "33 陶器 このカードを出すとすぐに食料2を得る。今後、製陶所は小さい進歩になり無料で作れる。 コスト: レ1 条件: 暖炉1",
            "34" : "34 かご スペースから木材を取るアクションのたびに、木材2をそのスペースに残して食料3を得ることができる。 コスト: 葦1",
            "35" : "35 穀物スコップ 「小麦を取る」のアクションのたびに、小麦をもう1つ得る。 コスト: 木1",
            "36" : "36 レンガの屋根 増築か改築をするとき、葦1または2を同数のレンガで代用できる。 条件: 職業1",
            "37" : "37 レンガの柱 レンガの家を増築するたびに、レンガ5と葦2をレンガ2と木材1と葦1で代用できる。 コスト: 木2",
            "38" : "38 聖マリア像 効果なし。（捨てた進歩カードによって得られるはずだった品物は全てなくなる） コスト: プレイ済み進歩2",
            "39" : "39 露店 このカードを出したらすぐ野菜1を得る。 コスト: 麦1 移動進歩",
            "40" : "40 小牧場 このカードを出したらすぐ1スペースを柵で囲んで牧場にする。（柵のコストの木材は不要） コスト: 食2 移動進歩",
            "41" : "41 石臼 パンを焼いて小麦を食料にするたびに、追加で食料2を得る。（パンを焼くアクション1回につき食糧2） コスト: 石1",
            "42" : "42 親切な隣人 このカードを出したらすぐ、石材1か葦1を得る。 コスト: 木1/レ1 移動進歩",
            "43" : "43 果物の木 ラウンド8-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3",
            "45" : "45 個人の森 これ以降の偶数ラウンドのスペースに、それぞれ木材1を置く。これらのラウンドのはじめにその木材を得る。 コスト: 食2",
            "46" : "46 荷車 ラウンド5・8・11・14のうちまだ始まっていないラウンドのスペースに、それぞれ小麦1を置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木2 条件: 職業2",
            "47" : "47 レタス畑 このカードの上に種まきのとき畑と同じように野菜を植えられる。ここから収穫してすぐに食料にすると食料4になる。（このカードは得点計算で畑に含めない） 条件: 職業3",
            "48" : "48 葦の池 これ以降の3ラウンドのスペースにそれぞれ葦1を置く。これらのラウンドのはじめにその葦を得る。 条件: 職業3",
            "49" : "49 書き机 「職業」のアクションで、2つの職業を続けて出せる。2枚目の職業を出すには、1枚目のコストに加えてさらに食料2を支払う。 コスト: 木1 条件: 職業2",
            "50" : "50 へら 「改築」のアクションなしに、木の家をいつでもレンガの家に改築できる。（資材は支払う） コスト: 木1",
            "51" : "51 糸巻き棒 収穫で畑フェイズのたび羊を3匹持っていれば食料1、5匹持っていれば食料2を得る。 コスト: 木1",
            "52" : "52 厩 このカードを出したらすぐ厩を1つ無料で建てる。 コスト: 木1 移動進歩",
            "53" : "53 撹乳器 収穫で畑フェイズのたびに羊がいれば羊3匹につき食料1を得る。同じく牛がいれば牛2匹につき食料1を得る。 コスト: 木2",
            "54" : "54 石切り場 「日雇い労働者」のアクションのたびに、追加で石材3を得る。 条件: 職業4",
            "55" : "55 石の家増築 このカードを出したらすぐ、石の家が1スペース増築される。 コスト: 葦1・石3 移動進歩",
            "56" : "56 石ばさみ ラウンド5-7か、ラウンド10-11で登場する「石材」のアクションのたびに、石材をもう1つ得る。 コスト: 木1",
            "57" : "57 ハト小屋 ラウンド10-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 石2",
            "58" : "58 家畜庭 このカードの上に好きな動物を2頭置ける。種類が異なっていても良い。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業1",
            "59" : "59 水飲み場 厩の有無に関わらず、自分の牧場は全て家畜が2頭多く入るようになる。（この効果は家畜庭、動物園にも適用される） コスト: 木2",
            "60" : "60 家畜市場 このカードを出したらすぐ牛1を得る。 コスト: 羊1 移動進歩",
            "61" : "61 鋤車 ゲーム中2回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木4 条件: 職業3",
            "62" : "62 折り返し鋤 ゲーム中1回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木3 条件: 職業2",
            "338" : "338 強力餌 収穫で食料供給フェイズのたびに、野菜1（最大1つまで）で自分の農場にいる家畜を1匹増やす。",
            "44" : "44 離れのトイレ 効果なし。他の人の中に、職業2つ未満の人がいるときのみに建てられる。 コスト: 木1・レ1",
            "63" : "63 突き鋤 ゲーム中に2回、「畑を耕す」のアクションで耕せる畑が１つから2つになる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木2 条件: 職業1",
            "64" : "64 喜捨 このカードを出した時点で、既に終わっているラウンド数だけ食料を得る。 条件: 職業なし 移動進歩",
            "65" : "65 パン焼き部屋 「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石2",
            "66" : "66 村の井戸 これ以降の3ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 井戸を返す",
            "67" : "67 脱穀そり 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションが行える。 コスト: 木2 条件: 職業2",
            "68" : "68 馬鍬 ゲーム中に1回だけ、「畑を耕す」か「畑を耕して種をまく」のアクションで耕せる畑が1つから2つになる。他の人もゲーム中に1回だけ、手番にあなたに食料2を払って同じことができる。 コスト: 木2",
            "69" : "69 イチゴ花壇 これ以降3ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑2",
            "70" : "70 地固め機 他の人が馬鍬か鋤類を使うたびに、すぐに畑1つを耕せる。 コスト: 木1",
            "71" : "71 別荘 ラウンド14で家族を一切使えない。このカードはラウンド13までに出すこと。 コスト: （木3/レ3）・葦2",
            "72" : "72 ガチョウ池 これ以降4ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3",
            "73" : "73 ゲスト このカードを出したらゲストトークンを取り、次のラウンドに家族として1回だけ使用できる。 コスト: 食2 移動進歩",
            "74" : "74 小麦車 「小麦1を取る」のアクションのたびに、追加で小麦2を得る。 コスト: 木2 条件: 職業2",
            "75" : "75 手挽き臼 収穫で食糧供給フェイズのたびに小麦1を食料2にするか、小麦2を食料4にできる。 コスト: 石1",
            "76" : "76 くまで ゲーム終了時に畑が5つ以上あればボーナス2点を得る。くびき・馬鍬・地固め機・鋤類のいずれかを出していれば畑が6つ必要。 コスト: 木1",
            "77" : "77 牧人の杖 区切られていない4スペース以上の牧場を新たに囲むたびに、その牧場に羊2頭を置く。 コスト: 木1",
            "78" : "78 雑木林 「種をまく」のアクションのたびに、このカードの上に木材を植えることができる。最大2つまで植えることができる。木材は畑の小麦のように扱い、畑フェイズで収穫する。（このカードは得点計算で畑に数えない） コスト: 木2 条件: 職業1",
            "79" : "79 木材荷車 アクションで木材を取るたびに、追加で木材2を得る。（この効果は木材が累積するスペースから木材を得た時のみ） コスト: 木3 条件: 職業3",
            "80" : "80 林 他の人が「木材3」のアクションを行うたびに、その中から1つをもらう。 コスト: 木1 条件: 職業3",
            "81" : "81 木の家増築 このカードを出したらすぐ木の家が1部屋増える。 コスト: 葦1・木5",
            "82" : "82 木のクレーン ラウンド5-7とラウンド10-11で登場する「石材1」のアクションのたびに、追加で石材1を得る。そのとき食料1を払えば追加分が石材1から石材2になる。 コスト: 木3",
            "83" : "83 林道 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 木1",
            "84" : "84 鶏小屋 これ以降の8ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 コスト: （木2/レ2）・葦1",
            "85" : "85 調理コーナー 以下の品をいつでも食料にできる。野菜：4　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: 調理場を返す",
            "86" : "86 乾燥小屋 畑フェイズの後で空いている畑があれば、すぐに小麦を植えられる。ただし置く小麦は1つ少なくなる。 コスト: （木2/レ2）・葦2",
            "87" : "87 かめ 誰かが井戸を作るか村の井戸に改良するたびに、他の人は食料1、自分は食料4を得る。（すでに井戸がある場合はカードを出したときに得る） コスト: レ1",
            "88" : "88 投げ縄 家族を続けて2人置ける。ただしそのうち少なくとも1人は「猪1」「牛1」「羊1」のいずれかに置くこと。 コスト: 葦1",
            "89" : "89 レンガ道 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: レ3",
            "90" : "90 プランター 家と接する畑に種をまくたびに、その畑に追加で小麦2か野菜1が置かれる。 条件: 職業2　",
            "91" : "91 はしご 増築や改築、水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋を作るたびに、コストの葦を1つ減らせる。 コスト: 木2",
            "92" : "92 堆肥 収穫しないラウンドの最後でも、全ての畑から小麦1か野菜1を取ることができる。（収穫する場合は全ての畑から収穫しなければならない） 条件: 家畜2",
            "93" : "93 酪農場 収穫で畑フェイズのたびに、はじめに全員の農場にいる全ての羊と牛を数える。羊5頭、牛3頭につきそれぞれ食料1を得る。 コスト: レ2・石3",
            "94" : "94 舗装道路 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 石5",
            "95" : "95 梁 「漁」か葦を取るアクションのたびに追加で食料1を得る。 コスト: 木1",
            "96" : "96 葦の交換 このカードを出したらすぐに葦2を得る。 コスト: 木2/レ2 移動進歩",
            "97" : "97 畜殺場 他の人が家畜を1頭以上、食料にするたびにストックから食料1を得る。食糧供給フェイズでは手番が最後になる。 コスト: レ2・石2",
            "98" : "98 火酒製造所 収穫で食糧供給フェイズのたびに野菜最大1を食料4にできる。ゲーム終了時に5つ目と6つ目の野菜1つにつき、それぞれボーナス1点を得る。 コスト: 野1・石2",
            "99" : "99 わら小屋 増築や改築を行うときに、葦がもう不要になる。 条件: 小麦畑3",
            "100" : "100 酒場 このカードは追加のアクションスペースになる。ここで他の人がアクションを行うと食料3を得る。自分でアクションを行うと、食料3かボーナス2点のどちらかを得る。 コスト: 木2・石2",
            "101" : "101 家畜の餌 得点計算の直前に、1匹以上所有している家畜の種類ごとに1匹ずつ増える。（農場内に置き場所が必要） 条件: 栽培中の畑4",
            "102" : "102 動物園 このカードの上に羊と猪と牛を各1頭ずつまでおくことができる。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業2",
            "103" : "103 水車 全員が畑フェイズのたびに小麦最大1を食料3にできる。他の人がこれを行ったら、その中から食料1をもらう。 コスト: 木1・レ2・葦1・石2",
            "104" : "104 週末市場 このカードを出したらすぐに野菜2を得る。 コスト: 麦3 移動進歩",
            "337" : "337 レンガ置き場 このカードは全員が使えるアクションスペースになる。ここを使うと持ち主に食料1を払ってストックからレンガ5を得る。持ち主が使うとレンガ5か2点を得る。 条件: 職業3",
            "105" : "105 平地 種をまくとき、畑2つに植えるようにしてこのカードの上に小麦2を植えることができる。（このカードは得点計算で畑に含めない） 条件: 職業1",
            "106" : "106 パン焼き小屋 「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石3",
            "107" : "107 建築用木材 このカードを出したらすぐに、木材3を得る。 コスト: 石1 移動進歩",
            "108" : "108 ミツバチの巣 これ以降の偶数ラウンドのスペースに、それぞれ食料を2つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 進歩2・職業3",
            "109" : "109 焼き串 収穫で食糧供給フェイズのたびに家畜を1頭以上食料にすると、追加で食料1を得る。 コスト: 木1",
            "110" : "110 醸造所 収穫で食糧供給フェイズのたびに、小麦最大1を食料3にできる。ゲーム終了時に収穫した小麦が9つ以上あればボーナス1点を得る。 コスト: 麦2・石2",
            "111" : "111 パン焼き棒 職業を出すたびに、続けて「パンを焼く」のアクションができる。 コスト: 木1",
            "112" : "112 本棚 職業を1つ出すたびに食料3を得る。この食料は、その職業を出すコストに使用できる。 コスト: 木1 条件: 職業3",
            "113" : "113 脱穀棒 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションができる。 コスト: 木1 条件: 職業1",
            "114" : "114 鴨の池 これ以降の3ラウンドのスペースに食料をそれぞれ1つずつ置く。これらのラウンドの最初にその食料を得る。 条件: 職業2",
            "115" : "115 耕運鋤 ゲーム中2回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業3",
            "116" : "116 穀物倉庫 ラウンド8・10・12のうちまだ始まっていないラウンドのスペースに小麦を1つずつ置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木3/レ3",
            "117" : "117 温室 現在のラウンドに4と7を足す。そのラウンドのスペースにそれぞれ野菜を1つずつ置き、ラウンドのはじめに食料1を払えばその野菜を得る。 コスト: 木2 条件: 職業1",
            "118" : "118 肥溜め 種まきで毎回、新しく植えた畑に小麦1か野菜1を追加で置く。 条件: 家畜4",
            "119" : "119 鉤型鋤 ゲーム中1回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業1",
            "120" : "120 ヤギ 食糧供給フェイズのたびに食糧1を得る。自分の家にはこのヤギ以外の動物を飼えなくなる。（調教師があっても不可）",
            "121" : "121 木挽き台 自分の牧場におく次の厩と3・6・9・12・15本目の柵は無料になる。（柵は牧場を完全に囲む形でしか置けない） コスト: 木2",
            "122" : "122 製材所 収穫のたびに、木材最大1を食料3にできる。ゲーム終了時に木材2/4/5でそれぞれ1/2/3点のボーナスを得る。（この後にまた家具製作所を獲得してもボーナス点はない） コスト: 家具製作所を返す",
            "123" : "123 木の宝石箱 ゲーム終了時、家の広さが5部屋なら2点、6部屋なら4点のボーナスを得る。 コスト: 木1",
            "124" : "124 くびき このカードを出すとすぐに、場に出ている全ての鋤類の数だけ畑を耕せる。（自分で出している分は数えない） コスト: 木1 条件: 牛1",
            "125" : "125 ほうき 手札の小さい進歩を全て捨て、新たに7枚引く。そしてすぐにコストを支払い、1枚実行できる。 コスト: 木1",
            "126" : "126 柄付き網 アクションで葦を取るたび、追加で食料2を得る。葦以外に他の資材も同時に取る場合は、追加で食料1を得る。 コスト: 葦1",
            "127" : "127 がらがら 「家族を増やす」のアクションのたびに（またはこのカードを出したラウンドに新しい家族が生まれていたら）、小麦が1つ以上ある畑にさらに小麦1を置く。 コスト: 木1",
            "128" : "128 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: かまどを返す",
            "129" : "129 穀物の束 このカードを出したらすぐに小麦1を得る。 移動進歩",
            "130" : "130 薬草畑 これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑1",
            "131" : "131 レンガ坑 「日雇い労働者」のアクションのたびに、追加でレンガ3を得る。 条件: 職業3",
            "132" : "132 レンガの家増築 このカードを出すとすぐに、レンガの家が1部屋増築される。 コスト: 葦1・レ4 移動進歩",
            "133" : "133 搾乳台 収穫の畑フェイズのたびに牛を1/3/5頭持っていればそれぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につきボーナス1点を得る。 コスト: 木1 条件: 職業2",
            "134" : "134 牛車 このカードを出したらすぐ、まだ始まっていないラウンドの数だけ（ただし最大3まで）畑を耕せる。 コスト: 木3 条件: 牛2",
            "135" : "135 ウマ ゲーム終了時、1種類の動物を1頭も持っていなかったら、ボーナス2点を得る。（いない家畜の代わりとして扱う。ただし、このカードの効果で家畜一種を補完した状態では、職業カード『村長』のボーナスを獲得できない。）",
            "136" : "136 柴屋根 増築や改築で、葦1か2を同数の木材に変えられる。 条件: 職業2",
            "138" : "138 葦の家 まだ登場していない家族コマをこのカードの上に置き、ゲーム終了時までここに住む。今のラウンドからアクションに使うことができ、食糧供給しなければならず、得点にならない。（後から「家族を増やす」のアクションで家に入れることができる） コスト: 木1・葦4",
            "139" : "139 寝室 他の人の家族が置いてあっても、家族を増やすアクションに家族を置いて実行できる。 コスト: 木1 条件: 小麦畑2",
            "140" : "140 白鳥の湖 これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業4",
            "142" : "142 石車 これ以降の偶数ラウンドのスペースに石材をそれぞれ1つずつ置く。これらのラウンドの最初にその石材を得る。 コスト: 木2 条件: 職業2",
            "143" : "143 石の交換 このカードを出したらすぐに、石材2を得る。 コスト: 木2/レ2 移動進歩",
            "144" : "144 ヴィラ ゲーム終了時、石の家1部屋につきボーナス2点を得る。（木骨の小屋とヴィラを持っている場合、ボーナス得点はヴィラのみになる） コスト: 木3・レ3・葦2・石3",
            "145" : "145 森の牧場 このカードの上に猪を何匹でも置ける。（このカードは得点計算で牧場に含めない） 条件: 職業3",
            "146" : "146 織機 畑フェイズのたびに羊を1/4/7頭持っていれば、それぞれ食料1/2/3を得る。ゲーム終了時に羊3頭につき1点のボーナスを得る。 コスト: 木2 条件: 職業2",
            "339" : "339 毛皮 食料にして共通のストックに戻した家畜1頭につき、食料1を自分のストックから取って部屋に置く。各部屋1食料ずつ置ける。この食料はもはや使うことができないが、ゲーム終了時にそれぞれボーナス1点に数える。 条件: 職業3",
            "137" : "137 カブ畑 種まきで、このカードの上に畑と同じように野菜を植えることができる。このカードを出したとき、追加で「種をまく」のアクションができる。（このカードは得点計算で畑に含めない） 条件: 職業3",
            "141" : "141 猪の飼育 このカードを出したらすぐに、猪1を得る。 コスト: 食1 移動進歩",
            "150" : "150 パン職人 収穫のたびにパン○の付いた進歩カードがあれば、食糧供給フェイズのはじめにパンを焼くことができる。このカードを出したときに、追加アクションとしてパンを焼くことができる。",
            "151" : "151 建築士 家が5部屋以上になったら、ゲーム中に1度だけ好きなタイミングで無料で1部屋増築できる。",
            "153" : "153 托鉢僧 ゲーム終了時に、物乞いカードを2枚まで返すことができ、返したカード分のマイナス点が入らない。",
            "162" : "162 肉屋 暖炉を持っていれば家畜をいつでも以下の割合で食料にできる。羊；2　猪：3　牛：4　",
            "171" : "171 港湾労働者 いつでも木材3をレンガ1か葦1か石材1のいずれかに交換できる。または、レンガ2/葦2/石材2のいずれかを好きな資材1と交換できる。",
            "172" : "172 族長 ゲーム終了時に石の家の1部屋につき1点追加ボーナス。このカードを出すには、追加で食料2が必要。",
            "173" : "173 族長の娘 他の人が「族長」を出したら、コスト無しでこのカードをすぐ出すことができる。ゲーム終了時に石の家なら3点、レンガの家なら1点を追加で得る。",
            "174" : "174 家庭教師 ゲーム終了時、このカードの後に出した職業1枚につき1点のボーナスを得る。",
            "175" : "175 柵管理人 柵を1つ以上置くたびに無料でさらに3つ置くことが出来る。（柵は牧場を完全に囲む形でしか置けない）",
            "176" : "176 木こり アクションで木材を取るたびに、追加で木材1を得る。",
            "179" : "179 販売人 「小さい進歩」か「小さい/大きい進歩」のアクションのたびに、食料1を払えばもう1回このアクションをできる。",
            "184" : "184 小売人 このカードの上に下から野菜・葦・レンガ・木材・野菜・石材・小麦・葦を1つずつ順番に重ねる。食料1でいつでも一番上の商品を買える。",
            "187" : "187 レンガ運び ラウンド6-14のうちまだ始まっていないラウンドのスペースに、1つずつレンガを置く。これらのラウンドのはじめにそのレンガを得る。",
            "188" : "188 レンガ混ぜ アクションでレンガだけを取るたびに、レンガ2を追加で得る。",
            "189" : "189 君主 ゲーム終了時に、各カテゴリーで4点まで到達すれば、それぞれ1点のボーナスを得る。（柵で囲まれた厩を4つ以上作った場合も含む）",
            "190" : "190 メイド レンガの家に住み次第、それ以降のラウンドのスペースに食料1を置く。これらのラウンドの最初にその食料を得る。（すでにレンガか石の家に住んでいれば、すぐに食料を置く）",
            "191" : "191 左官屋 石の家が4部屋以上になったら、1回だけ好きなときに1部屋を無料で増築できる。",
            "194" : "194 鋤職人 石の家を持つと、毎ラウンドのはじめに食料1を払って畑を最大1つ耕すことができる。",
            "195" : "195 鋤鍛冶 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに、食料1で耕す畑を1つ（最大１つまで）追加できる。",
            "196" : "196 キノコ探し アクションスペースにある木材を取るたび、その中から1つ取らずに残して代わりに食料2を得ることができる。",
            "199" : "199 改築屋 レンガの家に改築するときレンガが2つ少なくてよい。石の家に改築するとき石材が2つ少なくてよい。",
            "200" : "200 修理屋 木の家をレンガの家にせず、直接石の家に改築できる。",
            "202" : "202 季節労働者 「日雇い労働者」のアクションのたびに追加で小麦1を得る。ラウンド6からは小麦1でなく野菜1にしてもよい。",
            "207" : "207 厩番 柵を1つ以上置くたびに無料で厩を1つ手に入れすぐに置く。（置く場所は柵の内側でも外側でもよい）",
            "208" : "208 厩作り 柵で囲んでいない厩に、同じ家畜を3匹まで置くことが出来る。",
            "210" : "210 石運び アクションで石材を取るたびに追加でもう1つ得る。石材以外も取るときは、追加の石材を得るのに食料1を払う。",
            "218" : "218 大工 家の資材3と葦2で増築できる。",
            "147" : "147 畑商人 「野菜1を取る」のアクションのたびに追加で小麦1を取る。このカードを出したときにストックから野菜1を得る。",
            "148" : "148 大学者 小さい進歩を使う時や、代官・家庭教師で得点するときに、このカードを職業2つに数える。",
            "152" : "152 イチゴ集め アクションで木材を取るたびに、追加で食料1を得る。",
            "155" : "155 パン屋 誰か（自分も含む）がパンを焼くたびに、食料にした小麦1つにつき食料1を得る。",
            "156" : "156 ブラシ作り 食料にした猪をこのカードの上に置くことが出来る。ゲーム終了時にここの猪が2/3/4頭ならば、それぞれ1/2/3点のボーナスを得る。",
            "157" : "157 屋根がけ 増築・改築・水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋の建設で葦を1つ安くできる。",
            "158" : "158 旋盤職人 いつでも木材を食料にできる。木材1につき食料1。",
            "161" : "161 漁師 漁のアクションのたびにそこに置いてある食料の2倍を得る。ただし釣竿・いかだ・カヌー・梁・柄付き網の所有者がいたらそれぞれ食料1ずつ与える。",
            "165" : "165 自由農夫 ゲーム終了時に、未使用の農場スペースと物乞いだけがマイナス点になる。",
            "168" : "168 八百屋 「小麦1を取る」のアクションのたびに追加で野菜1を得る。",
            "170" : "170 大農場管理人 ゲーム終了時に3種類の家畜のそれぞれで自分より多い人がいなければ、3/4/5人プレイでそれぞれ2/3/4点ボーナスを得る。",
            "177" : "177 木大工 ゲーム終了時に、木の部屋1部屋につきボーナス1点を得る。",
            "182" : "182 炭焼き 自分か他の人がパンを焼く進歩（パン○）を行うたびに食料1と木材1を得る。（パンが焼かれる度ではなく、該当する進歩カードが場に出た瞬間）",
            "197" : "197 ほら吹き ゲーム終了時に、自分の前にある進歩カード5/6/7/8/9枚に対して、それぞれ1/3/5/7/9点ボーナスを得る。",
            "198" : "198 ネズミ捕り ラウンド10・12に他の人は全員、新しい家族のうち1人を置くことが出来ない。このカードは9ラウンド終了時までにしか出せない。（「新しい家族」とは3-5番目の家族の事を指す）",
            "205" : "205 葦集め これ以降の4ラウンドのスペースに葦を1つずつ置く。これらのラウンドのはじめにその葦を得る。",
            "209" : "209 石持ち いつでも石材を食料にできる。石材1につき食料2。",
            "211" : "211 石切り 大小の進歩・増築・改築全部が石材1安くなる。",
            "214" : "214 陶工 収穫で、毎回レンガ最大1を食料2にできる。",
            "217" : "217 代官 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に職業を一番多く持っている人は全員3点ボーナスを得る。",
            "341" : "341 ギルド長 家具製作所か家具職人を出すとすぐ木材4を得る。製陶所か陶工を出すとすぐレンガ4を得る。かご製作所かかご編みを出すとすぐ葦3を得る。ギルド長を出したとき、これらのカードをすでに出していれば対応する資材を2つ得る。",
            "149" : "149 パン焼き長老 自分がパン○のついた設備を持っていれば、他の人がパンを焼くたびパンを焼ける。自分で焼くときは追加で食料1を得る。",
            "159" : "159 家長 「増築」と「家族を増やす」が含まれるアクションを、他の人がすでに選んでいても行える。",
            "160" : "160 農場主 次に柵を作るとき、猪1を得る。それ以降、柵を1本以上作るたびに牛1を得る。",
            "163" : "163 畑守 「野菜1を取る」「畑1を耕す」「畑1を耕し種をまく」のアクションを、他の人がすでに選んでいてもそのアクションスペースを使って行える。",
            "164" : "164 営林士 3人ゲームから「木材2」のアクションカードを追加する。各ラウンドのはじめに木材2をその上に置く。この森を使う人から食料2をもらう。",
            "166" : "166 庭職人 「日雇い労働者」のアクションのたびに、追加で野菜1を得る。",
            "167" : "167 奇術師 「小劇場」のアクションのたびに、追加で小麦1を得る。",
            "169" : "169 昔語り 「小劇場」のアクションのたびに食料1をそのスペースに残して、代わりに野菜1を得る。",
            "178" : "178 小屋大工 ラウンド1-4に出せば、第11ラウンドのはじめに無料で1スペース増築できる。（石の家を除く）",
            "180" : "180 小さい庭師 このカードを出したときに野菜1を得る。さらに空いている畑があればこの野菜を植えることができる。",
            "181" : "181 コック 収穫で食糧供給フェイズのたびに、食糧2を食べる家族は2人だけになり、残りの家族は全員食料1で満足する。",
            "183" : "183 かご編み 収穫のたび、葦1（最大１つまで）を食料3にできる。",
            "185" : "185 レンガ焼き いつでもレンガを石材にできる。レンガ2につき石材1、レンガ3につき石材2に換える。",
            "186" : "186 レンガ屋 いつでもレンガ2を羊1か葦1に、レンガ3を猪1か石材1に、レンガ4を牛1にできる。",
            "192" : "192 パトロン これ以降職業を出すたびに、食料2を得る。この食料は今出した職業のコストの支払いに当てても良い。",
            "193" : "193 牧師 このカードを出したときか、それ以降に、家の広さが2部屋しかないのが自分だけである場合、1度だけ木材3・レンガ2・葦1・石材1を得る。",
            "201" : "201 牛使い 現在のラウンドに5と9を足す。そのラウンドのスペースにそれぞれ牛を1つずつ置き、そのラウンドのはじめにその牛を得る。",
            "203" : "203 羊飼い 収穫で繁殖フェイズのたびに、羊4頭以上あれば、子羊1頭ではなく2頭得る。ただし子羊のための場所が必要。",
            "204" : "204 羊飼い親方 これ以降の3ラウンドのスペースにそれぞれ羊1を置く。これらのラウンドのはじめにその羊を得る。",
            "206" : "206 ブタ飼い 「猪1」のアクションのたびに、猪をもう1頭得る。",
            "212" : "212 踊り手 「小劇場」のアクションのたびに、食料が1-3しか置いてなくても食料4を得る。",
            "213" : "213 家畜の世話人 2つ目の厩を建てると牛1、3つ目の厩で猪1、4つ目の厩で羊1を得る。（1度にいくつも建てた場合、その分だけ家畜を得る）",
            "215" : "215 家畜小作人 羊、豚、牛を各1頭ずつすぐにストックから借りる。得点計算の前に各1頭ずつ返す。返さなかった家畜1頭につき1点を失う。",
            "216" : "216 家畜守 同じ牧場の中に羊・猪・牛を飼える。自分の牧場全てに適用する。（ただし森の牧場を除く）",
            "154" : "154 醸造師 収穫で食糧供給フェイズのたびに、小麦1（最大1つまで）を食料3にできる。",
            "219" : "219 畑農 種をまくときに畑を1つだけにすると、その畑に小麦か野菜を追加で2つ置く。畑を2つにすると、小麦か野菜を追加で1つ置く。",
            "220" : "220 井戸掘り 「井戸」は大きな進歩ではなく小さな進歩になり石材1と木材1だけで作ることができる。",
            "225" : "225 畑番 「小麦1を取る」のアクションのたびに追加で畑を最大1つ耕せる。",
            "226" : "226 庭師 野菜畑から収穫するたびに、野菜を畑からではなくストックから取る。畑の野菜はそのままにしておく。",
            "227" : "227 共同体長 残りラウンド数が1/3/6/9ならば、すぐに木材1/2/3/4を得る。ラウンド14で5人以上の家族をアクションに使った人は全員、ゲーム終了時にボーナス3点を得る。（ゲスト、葦の家の住人も数える）",
            "231" : "231 召使 石の家に住んだら、すぐこれ以降のラウンドスペース全てに食料を3つずつ置く。これらのラウンドのはじめにその食料を得る。（カードを出したときすでに石の家に住んでいたらすぐ食料を並べる）",
            "233" : "233 農場管理 レンガか石の家に住み次第、次に増やす家族1人は部屋がいらなくなる。（それ以降の家族は通常通り）",
            "235" : "235 木材集め これ以降の5ラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。",
            "238" : "238 収入役 ラウンド11から、自分だけそれ以降のラウンドで使うラウンドカードのアクションも選べる。これらのカードは早くともラウンド11のはじめから表にしてボード上に置かれる。",
            "241" : "241 レンガ積み 木の家をレンガの家に改築するコストはレンガ1と葦1でよい。またレンガの家の増築は1部屋につきレンガ3と葦2になる。",
            "242" : "242 レンガ大工 レンガの家に住んだらすぐにこれ以降の5ラウンドのスペースにレンガを2つずつ置く。これらのラウンドのはじめにそのレンガを得る。（カードを出したときすでにレンガや石の家に住んでいたらすぐレンガを並べる）",
            "243" : "243 レンガ貼り 進歩と改築はレンガ1つ少なくできる。さらに増築はレンガ2つ少なくできる。",
            "244" : "244 居候 このカードを出した次の収穫を完全にスキップする。",
            "247" : "247 精肉屋 いつでも家畜を以下の割合で食料にできる。羊：1　猪：2　牛：3",
            "248" : "248 網漁師 葦を取るアクションのたび、帰宅フェイズで「漁」のアクションスペースにある食料を全部取る。",
            "256" : "256 石工 収穫のたび、石材1（最大１つまで）を食料3にできる。",
            "262" : "262 水運び 誰かが大きい進歩の「井戸」を作ったら、それ以降のラウンドのスペース全てに1つずつ食料を置く。それらのラウンドの最初にその食料を得る。（すでに井戸ができていたらすぐに食料を並べる）",
            "263" : "263 柵立て このカードを出したら自分の柵を1本好きなアクションに置く。自分がそのアクションを選ぶたび、追加で柵を置くアクションもできる。",
            "265" : "265 柵運び 現在のラウンドに6と10を足す。そのラウンドのスペースそれぞれに自分の柵を4本ずつ置き、ラウンドのはじめに食料2を払って4本全部を立てることができる。（木材は払わなくて良い）",
            "221" : "221 村の長老 カードを出した時点で残りラウンド数が1/3/6/9ラウンドならばすぐに、それぞれ木材1/2/3/4を得る。ゲーム終了時に進歩を一番多く出している人は全員3点ボーナスを得る。",
            "223" : "223 収穫手伝い 収穫のたび、食糧供給フェイズのはじめに誰か1人の畑1つから小麦1をとれる。相手は代わりに食料2をストックからとれる。",
            "224" : "224 畑作人 他の人が種をまくたびに3人ゲームでは小麦1、それ以外は食料1を得る。",
            "228" : "228 商人 「スタートプレイヤー」のアクションを選ぶたび、小さい進歩の後にもう一度小さい/大きい進歩ができる。",
            "234" : "234 材木買い付け人 他の人がアクションで木材を取るたびに（同意無しに）木材1を食料1（最大1つまで）で買い取れる。",
            "236" : "236 小作人 ゲーム終了時に未使用の土地スペース1つにつき食料1を支払えばマイナス点にならない。",
            "240" : "240 牛の飼育士 「牛1」のアクションのたびに追加で牛1を得る。",
            "245" : "245 てき屋 「小麦1を取る」のアクションのたびに追加で小麦1と野菜1を得ることができる。そのとき他の人は全員、小麦1をストックから得る。",
            "258" : "258 家具職人 収穫のたび、木材最大1を食料2にできる。",
            "259" : "259 家畜追い 「羊1」「猪1」「牛1」のアクションを行うたび、食料1を払って同じ種類の家畜をもう1頭得ることができる。",
            "222" : "222 成り上がり 1番にレンガの家や石の家に改築したらそれぞれ石材3を得る。2番目なら石材2、3番目なら石材1を得る。（カードを出す前に効果は遡らない）",
            "229" : "229 ごますり 「小麦1を取る」のアクションを行う人から前もって食料1をもらう。さらにストックから食料1を得る。自分が得るときもストックから追加で食料1を得る。",
            "230" : "230 穴掘り 3人ゲームから「レンガ1」を追加する。その上にすぐにレンガ3を置き、各ラウンドのはじめにレンガ1をその上に置く。このアクションを使う人から食料3をもらう。",
            "232" : "232 産婆 他の人が家族を増やすたび、その家族が自分より多いとストックから食料1を得る。2人以上多ければ食料2を得る。",
            "237" : "237 旅芸人 「小劇場」のアクションのたびにおいてある食料の2倍を得る。ただし曲芸師・猛獣使い・奇術師・昔語り・人形使い・街頭の音楽家・踊り手・魔術使いがいればそれぞれ食料1ずつ与えなければならない。",
            "239" : "239 脱穀職人 いつでも小麦１を食料3にできる。他の人は食料2を出してその小麦を買取りこの行動を無効にできる。複数名乗り出たら選んでよい。",
            "246" : "246 乳搾り 収穫のたび、畑フェイズで牛1/3/5頭がいれば、それぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につき1点ボーナスを得る。",
            "249" : "249 人形使い 他の人が「小劇場」のアクションを行うたびに食料1を払って職業1を出せる。",
            "250" : "250 羊使い 現在のラウンドに4・7・9・11を足す。そのラウンドにそれぞれ羊を1つずつ置き、ラウンドはじめにその羊を得る。",
            "251" : "251 葦買い付け人 毎ラウンド、最初に葦をとった人に食料最大1を支払い葦1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。",
            "252" : "252 猪飼い 置ける場所があればラウンド12の最後でも猪が繁殖する。このカードを出したらすぐに猪1を得る。",
            "253" : "253 猪猟師 アクションで木材を取るたびに、その中から2つ残して代わりに猪1を得る。",
            "254" : "254 馬手 石の家に住み次第、毎ラウンドのはじめに厩のアクションに家族を置かずに木材1で厩1（最大1つまで）を建てられる。",
            "255" : "255 石買い付け人 毎ラウンド、最初に石材をとった人に食料最大1を支払い石材1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。",
            "257" : "257 街頭の音楽家 他の人が「小劇場」のアクションを行うたびに、小麦1を得る。",
            "260" : "260 毒見役 他の人がスタートプレイヤーのたび、ラウンドのはじめにその人に食料1を払えば最初に家族を1人置ける。その後スタートプレイヤーから通常通りに置く。",
            "261" : "261 乗馬従者 今出たばかりのラウンドカードのアクションを行うたびに追加で小麦1を得る。",
            "264" : "264 柵作り 他の人が柵を1-4本立てるたびストックから木材1を得る。5本以上立てれば木材2を得る。",
            "340" : "340 農夫 毎ラウンドのはじめ（フェイズ1の前）に他の人より農場を多く使用していたら木材1を得る。",
            "267" : "267 養父母 食料1を払えば増やしたばかりの新しい家族でアクションができる。その場合、新しい家族は新生児には含めない。",
            "268" : "268 出来高労働者 アクションで木材・レンガ・葦・石材・小麦のいずれかを手に入れるたびに、食料1で同じものをもう1つ買える。野菜の場合は食料2で買える。",
            "270" : "270 乳母 増築のとき、増築した部屋の数だけすぐに家族を増やせる。家族1人につき食料1を払う。（新生児は次のラウンドになってからアクションに使える。増築した後に部屋のなかった家族がいれば移して、それでもなお空き部屋がある場合のみ有効）",
            "272" : "272 梁打ち 改築でレンガ1や石材1（最大1）を木材1で代用できる。増築ではレンガ2や石材2（最大2）を木材1で代用できる。",
            "274" : "274 有機農業者 ゲーム終了時に、家畜が1頭以上いて、かつまだ3頭以上入れられる牧場1つにつき1点のボーナスを得る。（森の牧場も含む）",
            "278" : "278 林務官 「種をまく」のアクションを行うたびにこのカードの上に木材を3つまで植えられる。小麦畑と同じように扱い、畑フェイズで収穫する。",
            "279" : "279 学者 石の家に住み次第、毎ラウンドのはじめに食料1で職業カードを出すかコストを払って小進歩カードを出せる。",
            "281" : "281 行商人 「小さい進歩1」のアクションのたびに、小さい進歩の代わりに大きい進歩ができる。「大きい進歩または小さい進歩1」では小さい進歩を2枚出せる。",
            "283" : "283 木材運び ラウンド8-14のうち、まだ始まっていないラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。",
            "284" : "284 木材配り 毎回ラウンドのはじめに「木材3」にある木材をその下の「レンガ1」「葦1」「漁」のマスに同じ数ずつ分けることができる。このカードを出したときに木材2を得る。このカードの効果で木材が配られたアクションスペースは「木材が累積するスペース」とみなす。",
            "286" : "286 小農夫 家畜2頭分だけの牧場に3頭飼えるようになる。持っている畑が全部で2つ以下なら、種をまくたびに小麦か野菜が1つ増える。",
            "290" : "290 レンガ職人 アクションで木材かレンガを取るたびに、追加でレンガ1を得る。",
            "292" : "292 露天商の女 アクションや小さい進歩で野菜を取るたびに、追加で小麦2を得る。",
            "293" : "293 鋤手 現在のラウンドに4・7・10を足す。そのラウンドのスペースにそれぞれ畑を1つずつ置き、これらのラウンドのはじめに食料1を払えばその畑を自分の農場における。",
            "300" : "300 火酒作り 収穫で食糧供給フェイズのたびに、野菜最大1を食料5にできる。",
            "301" : "301 彫刻家 進歩1・木の家の増築1・厩・柵のいずれかで、1ラウンドに1回、払う木材を1つ少なくできる。",
            "306" : "306 調教師 自分の家のどの部屋にも家畜を1頭ずつ置ける。種類が別でも良い。",
            "312" : "312 柵見張り 毎ラウンド1回だけ、建てた厩1つまでを即座に食料1を払うことで柵で囲み、1スペースの牧場にできる。柵のコストの木材は払わなくて良い。これは未使用スペースが牧場になったものとみなす。",
            "276" : "276 村長 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時にマイナス点がない人は全員5点のボーナスを得る。",
            "277" : "277 工場主 レンガか石の家に住み次第、家具製造所・製陶所・かご製作所は小さい進歩になり好きな資源2つ少なく作ることが出来る。",
            "280" : "280 革なめし工 食料にした猪と牛をこのカードの上に置く。ゲーム終了時に畜殺した猪が2/4/6頭または牛が2/3/4頭ならばそれぞれ1/2/3点のボーナスを得る。",
            "282" : "282 執事 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に家が一番広い人は全員3点のボーナスを得る。",
            "285" : "285 ブリキ職人 いつでもレンガを食料にできる。レンガ1につき食料1。誰かが井戸を作ればレンガ2につき食料3にできる。（村の井戸でも可）",
            "291" : "291 愛人 このカードを出したらすぐ「家族を増やす（部屋がなくてもよい）」のアクションを行う。このカードを出すのにコストとして追加で食料4が必要。",
            "294" : "294 柴結び 改築と増築で必要な葦を木材1で代用できる。",
            "296" : "296 種屋 「小麦1を取る」のアクションで追加で小麦1を取る。このカードを出したとき小麦1を得る。",
            "297" : "297 羊番 石の家に住み次第これ以降のラウンドのスペースに羊を1頭ずつ置く。これらのラウンドのはじめにその羊を得る。（カードを出したときすでに石の家ならばすぐに羊を置く）",
            "299" : "299 畜殺人 他の人が家畜を食料にするたびに、（食料にした頭数にかかわらず）食料1をストックから得る。食糧供給フェイズでは手番を最後に行う。",
            "266" : "266 畑好き 「種をまいてパンを焼く」のアクションのたびにアクションの前に小麦1を得る。あるいは手持ちの小麦1を野菜1と交換できる。",
            "269" : "269 曲芸師 「小劇場」のアクションのたび、他の人全員が家族を置き終わったあとで、小劇場に置いた家族を「畑1を耕す」か「小麦1を取る」か「畑1を耕して種をまく」のアクションのいずれかに（空いていれば）移動してそのアクションを行うことができる。",
            "271" : "271 職業訓練士 他の人が職業を出すたびに、食料3を払えば自分も職業1を出せる。4枚目以降の職業は食料2だけでよい。",
            "273" : "273 骨細工 食料にした猪1頭につき自分の木材2までをこのカードの上に置ける。1･4･7･10番目の木材を除きこのカードの上にある木材1につき1点のボーナスを得る。",
            "275" : "275 ぶらつき学生 職業を出すときに、職業カードの手札から誰かに引いてもらって出すことができる。そのたびに食料3を受け取り、その職業を出すのに払ってもよい。",
            "287" : "287 倉庫主 ラウンドのはじめに石材5以上持っていれば石材1、葦6以上で葦1、レンガ7以上でレンガ1、木材8以上で木材1を得る。",
            "288" : "288 倉庫番 1つのアクションで葦と石材の両方を取るたびに、追加でレンガ1か小麦1を得る。",
            "289" : "289 営農家 全員が家族を置いた後、「小麦1を取る」か「野菜1を取る」に家族を置いていれば、「種をまく」か「種をまいてパンを焼く」のアクションのどちらかに（空いていれば）移動してそのアクションを行うことが出来る。",
            "295" : "295 牛飼い 場所があればラウンド12の後にも牛が繁殖する。このカードを出したらすぐ牛1を得る。",
            "298" : "298 羊農 アクションで羊を取るたびに、追加で羊1をストックから得る。いつでも（繁殖フェイズを除く）羊3を牛1と猪1に交換できる。",
            "302" : "302 猪使い 現在のラウンドに4･7･10を足す。そのラウンドのスペースにそれぞれ猪1ずつ置き、ラウンドのはじめにその猪を得る。",
            "303" : "303 石打ち 「改築」のアクションなしで、いつでもレンガの家を石の家に改築できる。（ただし資材は払う）",
            "304" : "304 獣医 このカードを出したとき白いマーカー4、黒いマーカー3、茶色のマーカー2を取って袋の中に入れる。各ラウンドのはじめに2つ引く。同じなら1つを袋に戻して、同じ色の家畜を1頭得る。同じでなければ2つとも袋に戻す。",
            "305" : "305 家畜主 まだ始まっていなければラウンド7に羊1、ラウンド10に猪1、ラウンド14に牛1を置く。これらのラウンドのはじめに食料1でその家畜を買える。",
            "307" : "307 家畜飼い 未使用の土地から新しい牧場を作るたびに、以下のコストで家畜のつがいを1組買える。羊2頭は食料1、猪2頭は食料2、牛2頭は食料3。",
            "308" : "308 職場長 毎ラウンド、労働フェイズのはじめに共通のストックから食料1を取り、好きなアクションスペースに置く。",
            "309" : "309 織工 毎ラウンド、労働フェイズのはじめに羊2頭以上持っていれば、食料1を得る。",
            "311" : "311 魔術使い 自分の家族の最後の1人を「小劇場」のアクションに置くたびに、追加で小麦1と食料1を得る。",
            "342" : "342 猛獣使い 「小劇場」で取った食料ですぐに家畜を入手できる。羊1頭につき食料2、猪1頭につき食料2、牛1頭につき食料3。",
            "310" : "310 資材商人 このカードの上に下から石材・レンガ・石材・レンガ・葦・レンガ・木材を1つずつ順番に重ねる。一番上の品と同じものを他で取るたびに、一番上の品も得る。",
        };

        return json;
    }

})();
