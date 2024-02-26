# Dida365 Link

Seamlessly create [Dida365](https://dida365.com/)(Chinese version of TickTick) tasks and projects from Obsidian.

## Setup 

Go to the settings and add your **Dida365** username and password.
## Commands

- `Dida365 Link: Create task` will create a new Dida365 task in the **Inbox** from the current selected text or line in the Obsidian note and add links between the two for easy navigation.
- `Dida365 Link: Create project` will create a new Dida365 project from the current note.
- `Dida365 Link: Link task` will link a Dida365 task from the current selected text or line the Obsidian note and add links between the tow for easy navigation.
- `Dida365 Link: Link project` will link a Dida365 project from the current note.

## More Configuration

### General

- `Enable input prompt`: If enabled, the plugin will prompt you for input when creating a project/task.

### Task

- `Enable Dida365 task link`: If enabled, the plugin will attempt to create a link to Dida365 depends on the settings specified below.
- `Enable transform selection to Dida365 task link`: If enabled, the plugin will trasform current selection to a link to Dida365 task.
- `Enable transform line to Dida365 link`: If enabled, the plugin transforms the complete line to a link to Dida365 task.
- `Add Dida365 task link to frontmatter`: If enabled, the plugin will add a link to the Dida365 task in the frontmatter of the note.

### Project

- `Add Dida365 project link to frontmatter`: If enabled, the plugin will add a link to the Dida365 project in the frontmatter of the note.

> This feature denpends on [MetaEdit](https://github.com/chhoumann/MetaEdit) plugin.

## Thanks & Attribution

Thanks to [obsidian-things-link](https://github.com/gavinmn/obsidian-things-link) and [obsidian-todoist-link](https://github.com/dennisseidel/obsidian-todoist-link) for providing the initial idea and the basic code to implement the plugin.
