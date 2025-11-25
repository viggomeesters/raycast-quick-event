import { Action, ActionPanel, closeMainWindow, Icon, List, preferences, showToast, ToastStyle, copyTextToClipboard, Form, useNavigation } from '@raycast/api';
import { useEffect, useState } from 'react';
import { formatDate } from './dates';
import { CalendarEvent } from './types';
import { getRecentInvitees, saveRecentInvitees } from './storage';
import { executeJxa, parseEvent, useCalendar } from './useCalendar';

function EditInvitee({ initialValue, onEdit }: { initialValue: string; onEdit: (newValue: string) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Invitee"
            onSubmit={(values) => {
              onEdit(values.email);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" defaultValue={initialValue} />
    </Form>
  );
}

export default function Command() {
  const { isLoading, results, parse } = useCalendar();
  const [searchText, setSearchText] = useState('');
  const [recentInvitees, setRecentInvitees] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const storedInvitees = await getRecentInvitees();
      setRecentInvitees(storedInvitees);
    })();
  }, []);

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    parse(text);
  };

  const calendars = String(preferences.calendars.value)
    .split(',')
    .map((calendar) => calendar.trim())
    .filter((calendar) => calendar.length > 0);

  const persistInvitees = async (invitees: string[]) => {
    const normalized = invitees.map((invitee) => invitee.trim().toLowerCase()).filter((invitee) => invitee.length > 0);

    if (normalized.length === 0) {
      return;
    }

    const uniqueList = normalized.concat(recentInvitees.filter((invitee) => !normalized.includes(invitee)));
    const trimmed = uniqueList.slice(0, 50);

    setRecentInvitees(trimmed);
    await saveRecentInvitees(trimmed);
  };

  const getActiveTerm = (query: string) => {
    const match = query.match(/@(\S*)$/);
    if (match) {
      return match[1];
    }
    const withMatch = query.match(/\bwith\s+(\S*)$/i);
    if (withMatch) {
      return withMatch[1];
    }
    return null;
  };

  const activeTerm = getActiveTerm(searchText);

  const filteredInvitees = activeTerm
    ? recentInvitees.filter((invitee) => invitee.toLowerCase().includes(activeTerm.toLowerCase()))
    : recentInvitees;

  const buildQueryWithInvitee = (invitee: string) => {
    let newText = searchText;
    const match = newText.match(/@(\S*)$/);
    if (match && match.index !== undefined) {
      if (match.index > 0 && /\S/.test(newText[match.index - 1])) {
        const lastSpaceIndex = newText.lastIndexOf(' ', match.index);
        const startOfWord = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1;
        newText = newText.slice(0, startOfWord) + invitee;
      } else {
        newText = newText.slice(0, match.index) + invitee;
      }
    } else {
      const withMatch = newText.match(/\bwith\s+(\S*)$/i);
      if (withMatch && withMatch.index !== undefined) {
        newText = newText.slice(0, withMatch.index) + 'with ' + invitee;
      } else {
        const trimmed = newText.trim();
        if (trimmed.length === 0) {
          newText = invitee;
        } else {
          const hasWith = /\bwith\b/i.test(trimmed);
          newText = hasWith ? `${trimmed} ${invitee}` : `${trimmed} with ${invitee}`;
        }
      }
    }
    return newText;
  };

  const applyInviteeToQuery = (invitee: string) => {
    const nextQuery = buildQueryWithInvitee(invitee);
    setSearchText(nextQuery);
    parse(nextQuery);
  };

  const removeInvitee = async (invitee: string) => {
    const next = recentInvitees.filter((i) => i !== invitee);
    setRecentInvitees(next);
    await saveRecentInvitees(next);
    await showToast(ToastStyle.Success, 'Invitee removed');
  };

  const updateInvitee = async (oldValue: string, newValue: string) => {
    const normalized = newValue.trim().toLowerCase();
    if (!normalized || normalized === oldValue) return;

    const next = recentInvitees.map((i) => (i === oldValue ? normalized : i));
    const unique = Array.from(new Set(next));

    setRecentInvitees(unique);
    await saveRecentInvitees(unique);
    await showToast(ToastStyle.Success, 'Invitee updated');
  };

  const createEvent = async (item: CalendarEvent, calendarName: string) => {
    await executeJxa(`
      var app = Application.currentApplication()
      app.includeStandardAdditions = true
      var Calendar = Application("Calendar")
      
      var eventStart = new Date(${item.startDate.getTime()})
      var eventEnd = new Date(${item.endDate.getTime()})
      
      var projectCalendars = Calendar.calendars.whose({name: ${JSON.stringify(calendarName)}})
      var projectCalendar = projectCalendars[0]
      var event = Calendar.Event({
        summary: ${JSON.stringify(item.eventTitle)}, 
        startDate: eventStart, 
        endDate: eventEnd, 
        alldayEvent: ${item.isAllDay},
        recurrence: ${JSON.stringify(item.recurrence || '')},
      })
      projectCalendar.events.push(event)

      var invitees = ${JSON.stringify(item.invitees)}
      if (invitees.length > 0) {
        invitees.forEach(function(email) {
          try {
            event.attendees.push(Calendar.Attendee({email: email}))
          } catch (pushError) {
            try {
              event.make({new: 'attendee', withProperties: {email: email}})
            } catch (_) {}
          }
        })
      }
    `);

    await executeJxa(`
      var app = Application.currentApplication()
      app.includeStandardAdditions = true
      var Calendar = Application("Calendar")
      var date = new Date(${item.startDate.getTime()})
      Calendar.viewCalendar({at: date})
    `);
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="E.g. Movie at 7pm on Friday"
      throttle
    >
      <List.Section title="Your quick event">
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.eventTitle}
            subtitle={formatDate(item)}
            icon={Icon.Calendar}
            accessoryTitle={
              [
                item.recurrenceDescription || (item.recurrence ? 'Recurring' : null),
                item.invitees.length > 0
                  ? `${item.invitees.length} invitee${item.invitees.length === 1 ? '' : 's'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' • ')
            }
            actions={
              <ActionPanel>
                {calendars.map((calendar, index) => (
                  <ActionPanel.Item
                    key={index}
                    title={`Add to '${calendar}' Calendar`}
                    onAction={async () => {
                      try {
                        await createEvent(item, calendar);
                        await persistInvitees(item.invitees);
                        await closeMainWindow({ clearRootSearch: true });
                      } catch (error) {
                        console.error(error);
                        await showToast(
                          ToastStyle.Failure,
                          'Could not create event',
                          error instanceof Error ? error.message : String(error)
                        );
                      }
                    }}
                    icon={{ source: Icon.Calendar }}
                  />
                ))}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {filteredInvitees.length > 0 && (
        <List.Section title="Recent invitees">
          {filteredInvitees.map((invitee) => (
            <List.Item
              key={`recent-${invitee}`}
              title={invitee}
              icon={Icon.Person}
              accessoryTitle="Add to query"
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    title="Add Invitee to Query"
                    icon={Icon.Plus}
                    onAction={() => applyInviteeToQuery(invitee)}
                  />
                  {calendars.map((calendar, index) => (
                    <ActionPanel.Item
                      key={`create-${index}`}
                      title={`Create Event in '${calendar}'`}
                      icon={Icon.Calendar}
                      shortcut={index === 0 ? { modifiers: ['cmd'], key: 'return' } : undefined}
                      onAction={async () => {
                        const nextQuery = buildQueryWithInvitee(invitee);
                        const event = parseEvent(nextQuery);
                        if (event) {
                          try {
                            await createEvent(event, calendar);
                            await persistInvitees(event.invitees);
                            await closeMainWindow({ clearRootSearch: true });
                          } catch (error) {
                            console.error(error);
                            await showToast(
                              ToastStyle.Failure,
                              'Could not create event',
                              error instanceof Error ? error.message : String(error)
                            );
                          }
                        }
                      }}
                    />
                  ))}
                  <ActionPanel.Item
                    title="Copy Invitee"
                    icon={Icon.Clipboard}
                    onAction={() => copyTextToClipboard(invitee)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Invitee"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ['cmd'], key: 'e' }}
                      target={<EditInvitee initialValue={invitee} onEdit={(newValue) => updateInvitee(invitee, newValue)} />}
                    />
                    <Action
                      title="Remove Invitee"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                      onAction={() => removeInvitee(invitee)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
