<!-- Filename: after-effects-scripting-and-plugin-resources.md -->

# After Effects Scripting & Plugin Development – Resources

A curated, up‑to‑date list of documentation and learning resources for building:

- After Effects **scripts** (ExtendScript / JavaScript)
- **ScriptUI dockable panels** (UI panels written in JSX)
- **C++ plug‑ins** (.aex / .plugin), including UI and effect development

---

## 1. Core Scripting & ScriptUI Documentation

### 1.1 After Effects Scripting Guide (Community / Updated)

**Resource:** After Effects Scripting Guide (Community)  
**Type:** Comprehensive scripting reference (AE object model + ScriptUI)  
**Links:**

- Overview & intro (object model, ScriptUI, etc.):  
  [Overview – After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/overview/index.html)
- Home page (full guide):  
  [After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev)

**Covers:**

- AE object model (Application, Project, CompItem, AVLayer, Property, etc.)
- Working with items, layers, effects, keyframes, markers
- Render queue, preferences, app interaction
- **ScriptUI basics** and how to build user interfaces
- Various examples and snippets

---

### 1.2 Official “Scripts in After Effects” (Adobe HelpX)

**Resource:** Scripts in After Effects  
**Type:** Official user documentation on scripts, ScriptUI panels, and installation  
**Link:**

- [Scripts in After Effects](https://helpx.adobe.com/after-effects/using/scripts.html)

**Key topics:**

- Installing scripts and ScriptUI panels
- Difference between regular scripts and ScriptUI panels
- Script folders and paths (macOS/Windows)
- Enabling **“Allow Scripts To Write Files And Access Network”**
- Running scripts from:
  - File → Scripts
  - Window menu (for ScriptUI Panels)
  - Command line / command-line rendering

---

### 1.3 ExtendScript & ScriptUI Fundamentals

**Resource:** Adobe JavaScript Tools Guide (ExtendScript & ScriptUI)  
**Type:** Core reference for the ScriptUI toolkit (used in AE, Photoshop, etc.)  
**Link (archived but still relevant):**

- [Adobe JavaScript Tools Guide (ScriptUI)](https://estk.aenhancers.com/resources/JSToolsGuide.pdf)

**Covers:**

- ScriptUI framework (windows, dialogs, panels)
- Controls: buttons, edittext, dropdownlist, listbox, treeview, etc.
- Layout managers (orientation, alignment, margins)
- Events and event handling
- Drawing and custom UI elements

> Use this together with the AE Scripting Guide to understand both the host API and the UI layer.

---

## 2. ScriptUI Panels & UI Tooling

### 2.1 ScriptUI Panels in After Effects (Dockable UI)

**Resource:** ScriptUI Panels explained (in HelpX “Scripts in After Effects”)  
**Link:**

- [Scripts in After Effects – ScriptUI Panels section](https://helpx.adobe.com/after-effects/using/scripts.html#scriptui_panels)

**Key points:**

- Scripts placed in the **ScriptUI Panels** folder show up under the **Window** menu
- Panels are **dockable**, resizable, and behave like native AE panels
- Typical boilerplate pattern for `.jsx` panels:
  - Accept a `thisObj` parameter
  - Create a UI panel if running as a panel, or a window if run as a normal script

---

### 2.2 Visual ScriptUI Builder

**Resource:** ScriptUI Dialog Builder by Joonas (web-based UI builder)  
**Type:** Visual drag‑and‑drop UI designer that outputs ScriptUI code  
**Links:**

- App: [https://scriptui.joonas.me](https://scriptui.joonas.me)
- GitHub repo (if needed): [https://github.com/joonaspaakko/ScriptUI-Dialog-Builder-Joonas](https://github.com/joonaspaakko/ScriptUI-Dialog-Builder-Joonas)

**Workflow:**

1. Design your panel visually (buttons, text fields, sliders, etc.).
2. Export the generated ScriptUI code.
3. Wrap the generated code in an AE ScriptUI Panel boilerplate (e.g. `buildUI(thisObj)` pattern).
4. Save as `.jsx` in your After Effects **ScriptUI Panels** folder.

---

### 2.3 Practical “Dockable Panel” Tutorial

**Resource:** Easiest way to create a dockable panel in Adobe After Effects  
**Type:** Tutorial with boilerplate code and ScriptUI Builder usage  
**Link:**

- [Easiest way to create a dockable panel in Adobe After Effects](https://medium.com/@joonaspaakko/easiest-way-to-create-a-dockable-panel-in-adobe-after-effects-60f664732e79)

**Highlights:**

- Shows a modern way to build a dockable panel using ScriptUI Dialog Builder
- Includes example boilerplate code for AE panels
- Good for quickly getting from “UI idea” → “working dockable panel”

---

## 3. C++ Plugin Development (Effects, AEGPs, Custom UI)

### 3.1 After Effects C++ SDK Guide (Official)

**Resource:** After Effects C++ SDK Guide  
**Type:** Official, living documentation for the C++ plug‑in SDK  
**Link:**

- [After Effects C++ SDK Guide](https://ae-sdk-guide.readthedocs.io)

**Covers:**

- Overview: what you can build with the SDK (Effects, AEGPs, etc.)
- Project setup, build environment, supported compilers/platforms
- Effect basics:
  - Parameters and UI
  - Rendering pipeline
  - SmartFX, 16/32‑bpc, multithreading
- AEGP plug‑ins:
  - Integrating deeper with the host (automation, commands, hooks)
- GPU acceleration (Metal/DirectX/OpenGL, depending on version)
- Apple Silicon, Windows, and cross‑platform considerations

---

### 3.2 Official SDK Packages & Samples

**Resource:** After Effects SDK Downloads  
**Type:** SDK header files, sample plug‑ins, projects  
**Link:**

- [After Effects SDK Downloads (Adobe)](https://developer.adobe.com/after-effects/sdk/)

**What you get:**

- Sample projects for effects, utilities, and AEGPs
- Example UI setups for parameters and effect controls
- Build configurations for Xcode and Visual Studio
- Header files and libraries for the latest AE releases

---

### 3.3 Beginner-Friendly Plugin Tutorial

**Resource:** How To Create An After Effects Plugin – Development Tutorial  
**Type:** Practical walkthrough from zero to a basic plug‑in  
**Link:**

- [How To Create An After Effects Plugin – Development Tutorial – aescripts + aeplugins](https://aescripts.com/learn/how-to-create-an-after-effects-plugin)

**Focus:**

- Setting up the SDK on your system
- Creating a minimal effect plug‑in
- Working with the SDK sample code
- Building a solid mental model before going into advanced topics

---

### 3.4 AETK – Standard Library Toolkit for AE Plugins

**Resource:** Adobe After Effects Plugin Standard Library Toolkit (AETK)  
**Type:** Community toolkit wrapping the AE SDK for cleaner code  
**Link:**

- [Adobe After Effects Plugin Standard Library Toolkit (AETK)](https://github.com/AndrewYoungNZ/AETK)

**Why it’s useful:**

- Reduces boilerplate around common tasks
- Provides higher-level abstractions over the raw SDK where possible
- Good reference for “modern” AE SDK C++ style and patterns

---

## 4. Aggregated Knowledge & Community Hubs

### 4.1 AE Enhancers / Scripting Community

**Resource:** AE Enhancers (Forum & Resources)  
**Type:** Long‑running community focused on AE scripting and expressions  
**Links:**

- Forum: [https://www.aenhancers.com](https://www.aenhancers.com)

**Use it for:**

- Real‑world ScriptUI and scripting examples
- Q&A on tricky scripting problems
- Legacy but still valuable threads on UI panels, automation, and expressions

---

### 4.2 Adobe After Effects SDK & Scripting Forums

**Resource:** Adobe Support Community – After Effects SDK & Scripting  
**Type:** Official Adobe community for technical questions  
**Links:**

- General AE community: [https://community.adobe.com/t5/after-effects/bd-p/after-effects](https://community.adobe.com/t5/after-effects/bd-p/after-effects)
- SDK/Scripting subtopics are visible under “Discussions” and tagged threads

**Use it for:**

- Direct answers from Adobe engineers and experienced plugin devs
- Edge cases and undocumented behaviors
- Long‑form threads about SDK changes and migration tips

---

### 4.3 Reddit – After Effects & Plugin Dev

**Resource:** Reddit threads on AE scripting & plugins  
**Type:** Informal, curated link dumps and experience sharing  
**Examples:**

- General plugin resources & advice:  
  [https://www.reddit.com/r/AfterEffects/comments/13ve3r6/helpful_resources_to_start_building_ae_plugins](https://www.reddit.com/r/AfterEffects/comments/13ve3r6/helpful_resources_to_start_building_ae_plugins)

**Use it for:**

- Discovering additional tutorials, GitHub repos, and build scripts
- Getting a feel for common pain points and workflows
- Tips on Apple Silicon, CMake, modern C++ workflows, etc.

---

## 5. Script & Plugin Code Repositories / Examples

### 5.1 Popular AE Scripts & Panels (Reference)

Looking into the code of open‑source or well‑documented scripts can be extremely instructive.

**Examples (ScriptUI / JSX / Automation):**

- ft‑Toolbar, ft‑Studio, etc. (various GitHub mirrors and repos)  
- KBar, other popular toolbars and panels (often closed-source but documented feature-wise)

> Search GitHub for “after effects ScriptUI”, “after effects jsx panel”, or “after effects automation script” to find more real‑world examples of dockable panels and workflow tools.

---

### 5.2 Plugin Example Repositories

**Examples:**

- AETK examples:  
  [AETK Examples – GitHub](https://github.com/AndrewYoungNZ/AETK/tree/main/examples)
- Misc AE plugin samples from community devs:  
  Search GitHub for “after effects plugin sdk” or “after effects .aex” and filter by C++ projects.

**Use them to:**

- See real project structures (CMake or Xcode/VS projects)
- Learn patterns for parameter definitions, UI, and rendering
- Understand how people handle cross‑platform builds

---

## 6. Practical Starting Points (Cheat Sheet)

### 6.1 For Scripts & ScriptUI Panels

Start with:

1. **API + ScriptUI basics**
   - [After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev)
   - [Adobe JavaScript Tools Guide (ScriptUI)](https://estk.aenhancers.com/resources/JSToolsGuide.pdf)
2. **AE integration specifics**
   - [Scripts in After Effects](https://helpx.adobe.com/after-effects/using/scripts.html)
3. **Panel UI design**
   - [ScriptUI Dialog Builder](https://scriptui.joonas.me)
   - [Easiest way to create a dockable panel in Adobe After Effects](https://medium.com/@joonaspaakko/easiest-way-to-create-a-dockable-panel-in-adobe-after-effects-60f664732e79)
4. **Community support**
   - [AE Enhancers](https://www.aenhancers.com)

---

### 6.2 For C++ Plugin Development

Start with:

1. **Official SDK docs**
   - [After Effects C++ SDK Guide](https://ae-sdk-guide.readthedocs.io)
2. **SDK package & samples**
   - [After Effects SDK Downloads](https://developer.adobe.com/after-effects/sdk/)
3. **Guided intro**
   - [How To Create An After Effects Plugin – Development Tutorial](https://aescripts.com/learn/how-to-create-an-after-effects-plugin)
4. **Helper library**
   - [AETK – Adobe After Effects Plugin Standard Library Toolkit](https://github.com/AndrewYoungNZ/AETK)
5. **Community Q&A**
   - [Adobe After Effects Community](https://community.adobe.com/t5/after-effects/bd-p/after-effects)
   - [Reddit AE plugin resources thread](https://www.reddit.com/r/AfterEffects/comments/13ve3r6/helpful_resources_to_start_building_ae_plugins)

---
