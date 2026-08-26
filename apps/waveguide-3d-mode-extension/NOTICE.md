# Source basis and scope

This extension was built from the public HTML and WebGL interaction structure of [PA3FWM's Animation of fields in a rectangular waveguide](https://pa3fwm.nl/tools/waveguide.html), retrieved 2026-08-25.

Retained concepts are the 3D transparent rectangular guide, draggable camera rotation, animated field display, and red/blue electric/magnetic convention. The original page provides the TE10, TE20, and TE30 two-diagonal-wave demonstration. This extension evaluates analytical rectangular-waveguide eigenmodes so it can additionally represent TE01, TE11, TE21, TM11, and TM21 in three dimensions.

`three.module.js` is the locally bundled Three.js r108 module retrieved from the original page's direct dependency. Verify its upstream license and suitability before redistributing this folder.
