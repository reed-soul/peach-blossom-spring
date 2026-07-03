// 桃源村叙事 — 四位村民各有主题线，第四轮记录态度倾向，最终抉择在 final_choice

EXTERNAL visit_npc(name)
EXTERNAL record_choice(choice)
EXTERNAL set_ending(ending)
EXTERNAL mark_arc_complete(name)

VAR old_man_lines = 0
VAR fisher_lines = 0
VAR scholar_lines = 0
VAR child_lines = 0

// ── 老翁：时间断裂 · 不知有汉 ──────────────────────────────

=== laoweng ===
{ old_man_lines:
    - 0: -> laoweng_1
    - 1: -> laoweng_2
    - else: -> laoweng_late
}

=== laoweng_late ===
{ old_man_lines == 2:
    -> laoweng_3
}
{ old_man_lines == 3:
    -> laoweng_4
}
-> laoweng_done

=== laoweng_1 ===
晋太元间天下大乱，老夫随乡人逃入此山，再未踏出洞口半步。
~ old_man_lines = 1
~ visit_npc("老翁")
-> END

=== laoweng_2 ===
若要问今夕何年？老夫实不知有汉，无论魏晋——外面是何等年月，早已记不清了。
~ old_man_lines = 2
~ visit_npc("老翁")
-> END

=== laoweng_3 ===
村中黄发垂髫，怡然自乐。外人偶至，见而大惊，问所从来——皆不知山外有世。
~ old_man_lines = 3
~ visit_npc("老翁")
-> END

=== laoweng_4 ===
~ old_man_lines = 4
此地无战乱、无赋税，只有桃花与溪水。年轻人，你心里可还有牵挂？
+ [此心安处，便是桃源]
    ~ record_choice("stay_hint")
    ~ mark_arc_complete("老翁")
    -> DONE
+ [山外尚有未了之事]
    ~ record_choice("return_hint")
    ~ mark_arc_complete("老翁")
    -> DONE

=== laoweng_done ===
老夫的话你已听过。村中诸事，还需你自己拿主意。
-> END

// ── 渔女：田园日常 · 与世隔绝 ──────────────────────────────

=== yunv ===
{ fisher_lines:
    - 0: -> yunv_1
    - 1: -> yunv_2
    - else: -> yunv_late
}

=== yunv_late ===
{ fisher_lines == 2:
    -> yunv_3
}
{ fisher_lines == 3:
    -> yunv_4
}
-> yunv_done

=== yunv_1 ===
小女子每日织网捕鱼，日出而作，日落而息，日子过得极是清闲。
~ fisher_lines = 1
~ visit_npc("渔女")
-> END

=== yunv_2 ===
桃花林外头是什么模样？我自小在此长大，只听过「乱世」二字，却未亲眼见过。
~ fisher_lines = 2
~ visit_npc("渔女")
-> END

=== yunv_3 ===
阡陌交通，鸡犬相闻。男女衣着，悉如外人；黄发垂髫，并怡然自乐——这便是我们的日子。
~ fisher_lines = 3
~ visit_npc("渔女")
-> END

=== yunv_4 ===
~ fisher_lines = 4
你若见过外面的纷争，便知此处可贵。留下来吧，这里没有忧愁。
+ [愿与此地长相守]
    ~ record_choice("stay_hint")
    ~ mark_arc_complete("渔女")
    -> DONE
+ [渔火之外，尚有归途]
    ~ record_choice("return_hint")
    ~ mark_arc_complete("渔女")
    -> DONE

=== yunv_done ===
你且去别处走走，听听别人的故事吧。
-> END

// ── 书生：避秦乱世 · 典籍与心安 ────────────────────────────

=== shusheng ===
{ scholar_lines:
    - 0: -> shusheng_1
    - 1: -> shusheng_2
    - else: -> shusheng_late
}

=== shusheng_late ===
{ scholar_lines == 2:
    -> shusheng_3
}
{ scholar_lines == 3:
    -> shusheng_4
}
-> shusheng_done

=== shusheng_1 ===
我本是读书人。先世避秦时乱，率妻子邑人来此绝境，不复出焉。
~ scholar_lines = 1
~ visit_npc("书生")
-> END

=== shusheng_2 ===
村中典籍虽少，但内心安宁。乱世之中，能得一隅读书，已是万幸。
~ scholar_lines = 2
~ visit_npc("书生")
-> END

=== shusheng_3 ===
村中问今为何世，乃不知有汉，无论魏晋。此语非虚言，而是世代相传的真相。
~ scholar_lines = 3
~ visit_npc("书生")
-> END

=== shusheng_4 ===
~ scholar_lines = 4
所谓世外桃源，不过是人心所向。你可愿在此放下尘念？
+ [放下尘念，栖身于此]
    ~ record_choice("stay_hint")
    ~ mark_arc_complete("书生")
    -> DONE
+ [天下未定，读书人岂能独善]
    ~ record_choice("return_hint")
    ~ mark_arc_complete("书生")
    -> DONE

=== shusheng_done ===
书中自有桃源，你心中想必也已有答案。
-> END

// ── 童子：纯真 · 不知山外有世 ──────────────────────────────

=== tongzi ===
{ child_lines:
    - 0: -> tongzi_1
    - 1: -> tongzi_2
    - else: -> tongzi_late
}

=== tongzi_late ===
{ child_lines == 2:
    -> tongzi_3
}
{ child_lines == 3:
    -> tongzi_4
}
-> tongzi_done

=== tongzi_1 ===
大哥哥，你从哪里来的呀？山外面也有这么多桃花吗？
~ child_lines = 1
~ visit_npc("童子")
-> END

=== tongzi_2 ===
阿爹说外面的人打来打去，好吓人。我们这里只有桃子甜、溪水清！
~ child_lines = 2
~ visit_npc("童子")
-> END

=== tongzi_3 ===
见渔人，乃大惊，问所从来——我第一次见山外来客，就像你现在这样！
~ child_lines = 3
~ visit_npc("童子")
-> END

=== tongzi_4 ===
~ child_lines = 4
大哥哥别走嘛！留下来跟我一起玩，我带你摘最甜的桃子！
+ [好，多住些日子]
    ~ record_choice("stay_hint")
    ~ mark_arc_complete("童子")
    -> DONE
+ [哥哥还有路要走]
    ~ record_choice("return_hint")
    ~ mark_arc_complete("童子")
    -> DONE

=== tongzi_done ===
大哥哥你快点决定呀，桃子要熟啦！
-> END

// ── 最终抉择（须完成至少三位村民主题线后触发）────────────────

=== final_choice ===
你已与桃源中人深谈，所闻所感，皆在心头。渔人临别，村人叮嘱：「不足为外人道也。」——而你，将何去何从？
+ [留在桃源，与世无争]
    ~ set_ending("stay")
    -> DONE
+ [回归尘世，踏上归途]
    ~ set_ending("return")
    -> DONE

=== DONE ===
-> END
