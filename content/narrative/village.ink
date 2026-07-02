// 桃源村叙事 — 与村民对话及结局分支

EXTERNAL visit_npc(name)
EXTERNAL record_choice(choice)
EXTERNAL set_ending(ending)

VAR old_man_lines = 0
VAR fisher_lines = 0
VAR scholar_lines = 0
VAR child_lines = 0

=== laoweng ===
{ old_man_lines:
    - 0: -> laoweng_1
    - 1: -> laoweng_2
    - else: -> laoweng_3
}

=== laoweng_1 ===
老夫在此隐居数十载，不知今夕何年。
~ old_man_lines = 1
~ visit_npc("老翁")
-> END

=== laoweng_2 ===
年轻人，你从何而来？可曾见过外面的世界？
~ old_man_lines = 2
~ visit_npc("老翁")
-> END

=== laoweng_3 ===
此地无忧无虑，你可愿留下？
~ old_man_lines = 3
~ visit_npc("老翁")
+ [我愿留下]
    ~ record_choice("stay_hint")
    ~ set_ending("stay")
    -> DONE
+ [我思念家乡]
    ~ record_choice("return_hint")
    ~ set_ending("return")
    -> DONE

=== yunv ===
{ fisher_lines:
    - 0: -> yunv_1
    - 1: -> yunv_2
    - else: -> yunv_3
}

=== yunv_1 ===
小女子每日在此织网捕鱼，日子清闲得很。
~ fisher_lines = 1
~ visit_npc("渔女")
-> END

=== yunv_2 ===
你可知道，这桃花林外头，已过了多少年月？
~ fisher_lines = 2
~ visit_npc("渔女")
-> END

=== yunv_3 ===
留下来吧，这里没有纷争。
~ fisher_lines = 3
~ visit_npc("渔女")
+ [这里真好]
    ~ record_choice("stay_hint")
    ~ set_ending("stay")
    -> DONE
+ [外面的世界也在等我]
    ~ record_choice("return_hint")
    ~ set_ending("return")
    -> DONE

=== shusheng ===
{ scholar_lines:
    - 0: -> shusheng_1
    - 1: -> shusheng_2
    - else: -> shusheng_3
}

=== shusheng_1 ===
我本是读书人，因避战乱来到此地。
~ scholar_lines = 1
~ visit_npc("书生")
-> END

=== shusheng_2 ===
这里典籍虽少，但内心安宁。
~ scholar_lines = 2
~ visit_npc("书生")
-> END

=== shusheng_3 ===
所谓世外桃源，不过是人心所向罢了。
~ scholar_lines = 3
~ visit_npc("书生")
+ [说得有理]
    ~ record_choice("stay_hint")
    ~ set_ending("stay")
    -> DONE
+ [天下未定，我不能独善]
    ~ record_choice("return_hint")
    ~ set_ending("return")
    -> DONE

=== tongzi ===
{ child_lines:
    - 0: -> tongzi_1
    - 1: -> tongzi_2
    - else: -> tongzi_3
}

=== tongzi_1 ===
哥哥姐姐，你从哪里来的呀？
~ child_lines = 1
~ visit_npc("童子")
-> END

=== tongzi_2 ===
这里好玩的！有很多桃子可以吃！
~ child_lines = 2
~ visit_npc("童子")
-> END

=== tongzi_3 ===
你怎么不进来坐坐呢？
~ child_lines = 3
~ visit_npc("童子")
-> END

=== final_choice ===
你已与桃源中人交谈，是时候做出选择了。
+ [回归尘世]
    ~ set_ending("return")
    -> DONE
+ [留在桃源]
    ~ set_ending("stay")
    -> DONE

=== DONE ===
-> END
