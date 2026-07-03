// 结局文案 — 根据 storyState 与村民记忆分支

EXTERNAL visited_count()
EXTERNAL has_choice(name)
EXTERNAL visited_npc(name)
EXTERNAL completed_arc_count()

=== stay ===
{ completed_arc_count() >= 3 && has_choice("stay_hint"):
    -> stay_warm
- else:
    -> stay_quiet
}

=== stay_warm ===
[TITLE]此中人语云
[QUOTE]不足为外人道也。
{ visited_npc("老翁"):
    [MEMORY]老翁说「不知有汉，无论魏晋」——时间在此停驻，你也选择停驻。
}
{ visited_npc("渔女"):
    [MEMORY]渔女织网捕鱼的身影，成为此后每个清晨的风景。
}
{ visited_npc("书生"):
    [MEMORY]书生的典籍虽少，但你说：心安处，即是桃源。
}
{ visited_npc("童子"):
    [MEMORY]童子拉着你摘桃子，笑声落在桑竹之间。
}
[BODY]你一次次被村民的真挚打动，终于放下了对外界的牵挂。在这里，日出而作，日落而息，与桃花为伴，与溪水为邻。没有纷争，没有忧愁，只有宁静与美好。
[FOOTER]桃花源记 · 陶渊明
-> END

=== stay_quiet ===
[TITLE]此中人语云
[QUOTE]不足为外人道也。
[BODY]你选择了留下。山林不语，溪水长流，日子缓慢而安稳。
[FOOTER]桃花源记 · 陶渊明
-> END

=== return_path ===
{ has_choice("return_hint"):
    -> return_reflective
- else:
    -> return_default
}

=== return_default ===
[TITLE]后遂无问津者
[QUOTE]南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。
[BODY]你回到了尘世，却再也找不到来时的路。桃源如梦，梦醒无痕。
[FOOTER]桃花源，终究只存在于记忆之中。
-> END

=== return_reflective ===
[TITLE]后遂无问津者
[QUOTE]南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。
{ visited_npc("老翁"):
    [MEMORY]老翁的叮嘱犹在耳边：「不足为外人道也。」
}
{ visited_npc("书生"):
    [MEMORY]书生叹道：天下未定，读书人岂能独善——你终究未能置身事外。
}
{ visited_npc("渔女"):
    [MEMORY]渔女望着溪水，没有挽留，只轻声说：「外面也在等你。」
}
{ visited_npc("童子"):
    [MEMORY]童子挥着小手，桃子还挂在枝头，你却已转身离去。
}
[BODY]你带着村民的嘱托踏上归途，沿途处处做记。可再寻时，桃花依旧，洞口却再无踪影。或许，桃源本就不该被外人道破。
[FOOTER]桃花源，终究只存在于记忆之中。
-> END
