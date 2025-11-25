
# Quick Event Extension for Raycast

Quick Event is an extension for [Raycast](https://www.raycast.com/) that provides a natural language way to add a new event to your calendars. Built using [Sherlock](https://github.com/neilgupta/Sherlock).


## Screenshots

![Screenshot](assets/screenshot-1.png)


## Install Locally

Clone the project

```bash
  git clone https://github.com/mblode/raycast-quick-event.git
```

Go to the project directory

```bash
  cd raycast-quick-event
```

Install dependencies

```bash
  npm install
```

Build locally

```bash
  npm run dev
```

Finally open Raycast and use the command `Import Extension` then choose the cloned directory
## Features

- **Natural Language Parsing**: Create events just by typing (e.g., "Lunch tomorrow at 1pm").
- **Invitees**: Add attendees by email.
  - Example: `Meeting with viggo@example.com`
  - Supports multiple invitees.
- **Recent Invitees**:
  - Automatically remembers people you invite.
  - **Autocomplete**: Type `@` or `with` to see suggestions from your history.
  - **Management**: Edit or remove recent invitees directly from the list (⌘E to edit, ⌃X to remove).
- **Recurring Events**:
  - Create repeating events easily.
  - Supports daily, weekly, monthly, yearly patterns.
  - Specific days: `every Mon, Wed, Fri`.
  - Intervals: `every 2 weeks`.

## Create Event Examples

- February 24 at 3pm - 2pm March 3
- Vacation is in 4 weeks...
- Christmas is on December 25th.
- Homework 5 due next monday at 3pm
- Let's have lunch on the 3rd.
- The retreat is from Jan 12 - 29.
- Bake a cake tomorrow.
- **Meeting with test@example.com next Friday**
- **Team Sync every Monday at 10am**
- **Gym every Mon, Wed, Fri at 7am**

## Extension Preferences

The `Your calendars` text field is *required*
- Specify your calendar or multiple calendars (comma separated, no space between calendar names)
- The calendar names can be found in the sidebar of Calendar.app
- E.g., "Personal,Work Calendar"


## Create Event Examples

- February 24 at 3pm - 2pm March 3
- Vacation is in 4 weeks...
- Christmas is on December 25th.
- Homework 5 due next monday at 3pm
- Let's have lunch on the 3rd.
- The retreat is from Jan 12 - 29.
- Bake a cake tomorrow.
- Use Tabule today!


## Author

**Matthew Blode** (mblode)

- [GitHub](https://www.github.com/mblode)
- [Portfolio](https://matthewblode.com)


## Related Projects

- [Sherlock](https://github.com/neilgupta/Sherlock)
- [Chrono](https://github.com/wanasit/chrono)
- [Calfred](https://github.com/ruggi/calfred)
- [Fantastically Good Event Parser](https://polymaths.blog/2018/06/fantastically-good-event-parser-for-drafts-5)
- [Fantastical](https://flexibits.com/fantastical)
