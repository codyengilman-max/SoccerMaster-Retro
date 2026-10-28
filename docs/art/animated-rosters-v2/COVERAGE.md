# Animation coverage — partial delivery

The image service repeatedly returned HTTP 400, Unknown parameter: reasoning. Remaining drawing jobs are retained in REMAINING_DRAWINGS.json for continuation. No game integration has been performed.

| Team | Packed appearance IDs | Missing source sheets |
|---|---|---|
| fc_batavia | fc_batavia_01, fc_batavia_02, fc_batavia_03, fc_batavia_04, fc_batavia_05, fc_batavia_06, fc_batavia_07, fc_batavia_08, fc_batavia_09 | None |
| royal_salt | royal_salt_01, royal_salt_02, royal_salt_03, royal_salt_04, royal_salt_05, royal_salt_06, royal_salt_07, royal_salt_08, royal_salt_09 | None |
| valley_rising | valley_rising_01, valley_rising_02, valley_rising_03, valley_rising_04, valley_rising_09 | valley_rising_b_actions |
| desert_tuzon | desert_tuzon_01, desert_tuzon_02, desert_tuzon_03, desert_tuzon_04, desert_tuzon_09 | desert_tuzon_b_motion |
| sol_vista | sol_vista_09 | sol_vista_a_actions, sol_vista_b_motion |
| next_horizon | next_horizon_01, next_horizon_02, next_horizon_03, next_horizon_04, next_horizon_09 | next_horizon_b_motion, next_horizon_b_actions |
| visitor_1 | None | visitor_1_a_motion, visitor_1_a_actions, visitor_1_b_motion, visitor_1_b_actions, visitor_1_keeper |
| visitor_2 | None | visitor_2_a_motion, visitor_2_a_actions, visitor_2_b_motion, visitor_2_b_actions, visitor_2_keeper |
| visitor_3 | visitor_3_09 | visitor_3_a_motion, visitor_3_a_actions, visitor_3_b_motion, visitor_3_b_actions |
| visitor_4 | None | visitor_4_a_motion, visitor_4_a_actions, visitor_4_b_motion, visitor_4_b_actions, visitor_4_keeper |

Blake: front run, back run and chip supplement is packed. Retain his existing side run and other actions.

Motion source sheets contain four appearances per sheet, each with 12 running poses (side/front/back). Action sheets contain their pass/shot/chip poses plus held states. Both are needed before a complete outfield appearance atlas is packed. Sources for partially finished groups are retained even if that group has no packed atlas yet.

Additional exclusions: three held slide poses failed identity review and are disabled in the clip metadata. This does not remove those players' running, passing, shooting or chip clips.
