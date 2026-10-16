# Practical Devin boundaries
Reviewed against official documentation on 2026-10-15.

Documented: Devin can inspect a connected repository, implement code, run an app, interact through its browser/desktop, produce a pull request and record a test walkthrough. Documentation recommends specific scope, concrete references and verifiable success criteria. Ask Devin can investigate and prepare an Agent-session task.

Engineering judgment for this project: static PNG layers, live dialogue text, small code-driven transitions and a Canvas2D/Phaser rendering adapter fit that workflow. Supplying actual source art and a working reference avoids asking it to infer an art style from a long prompt. This is a reasoned integration approach, not a documented guarantee that Devin can finish a whole game autonomously.

Not assumed: professional multi-frame character animation from one PNG; perfect new portrait identity in unsupervised generation; a physical iPhone in every session; authenticated access to this private ChatGPT preview or Cloudflare; unlimited attachments/context/compute; automatic art approval or deployment. No fixed upload size or ZIP support is promised because the user's surface previously rejected a ZIP.

Split into import/map, gameplay renderer, cutscene renderer and verification. Do not use a multi-megabyte prompt. Images belong in files/repo. New art is supplied here; missing expression/wardrobe assets should be reported instead of approximated invisibly.

Official sources:
- https://docs.devin.ai/essential-guidelines/when-to-use-devin — scoped tasks, examples and measurable outcomes.
- https://docs.devin.ai/work-with-devin/ask-devin — repository exploration and planning to Agent sessions.
- https://docs.devin.ai/work-with-devin/testing-and-recordings — app testing and recorded walkthroughs.
- https://docs.devin.ai/work-with-devin/computer-use — desktop interaction capabilities; platform availability does not imply access in this user's session.

The package has not been sent to Devin, merged to GitHub or deployed to the user's Cloudflare game by this creation task.
