import argparse
import csv
import datetime as dt
import json
import os
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/madenroll-mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import MaxNLocator

source = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description='Render the Fall 2026 report SVG charts.')
parser.add_argument('--revised-export', type=Path)
args = parser.parse_args()
data_path = source / 'report-data.json'
data = json.loads(data_path.read_text())

if args.revised_export:
    rows = list(csv.reader(args.revised_export.open(), delimiter='\t'))
    data['top_courses'] = [{'name': row[1], 'subscriptions': int(row[2])} for row in rows if row[0] == 'course_users']
    data['top_subjects'] = [{'name': row[1], 'subscriptions': int(row[2])} for row in rows if row[0] == 'subject_courses']
    daily = {row[1]: int(row[2]) for row in rows if row[0] == 'daily_emails'}
    data['subscription_chart_basis'] = 'One subscription per user-course pair; subject totals sum those pairs.'
    data['daily_notification_basis'] = 'All recorded emails, including course, welcome and other emails.'
    start = dt.date(2026, 4, 1)
    end = dt.date(2026, 9, 11)
    data['daily_notifications'] = [
        {'date': (start + dt.timedelta(days=offset)).isoformat(),
         'emails': daily.get((start + dt.timedelta(days=offset)).isoformat(), 0)}
        for offset in range((end - start).days + 1)
    ]
    if sum(row['emails'] for row in data['daily_notifications']) != data['all_successful_mail_records']:
        raise ValueError('Daily email totals differ from the report total.')
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

output = source.parents[1] / 'public/news/fall-2026-report'
output.mkdir(parents=True, exist_ok=True)
colors = {
    'open': '#a7e66f',
    'waitlist': '#ffcdac',
    'bar': '#99cdff',
    'primary': '#ffa9cc',
    'line': '#33ccbb',
    'ink': '#17313c',
    'muted': '#5d747c',
    'grid': '#e3ece9',
}
plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'font.size': 13,
    'text.color': colors['ink'],
    'axes.labelcolor': colors['ink'],
    'xtick.color': colors['muted'],
    'ytick.color': colors['muted'],
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.spines.left': False,
    'axes.spines.bottom': False,
    'axes.axisbelow': True,
    'svg.fonttype': 'path',
    'svg.hashsalt': 'madenroll-fall-2026',
    'figure.facecolor': 'white',
    'axes.facecolor': 'white',
})

def save(fig, name):
    for directory in (source, output):
        fig.savefig(directory / f'{name}.svg', bbox_inches='tight', metadata={'Date': None})
    plt.close(fig)

def bars(rows, label, name):
    fig, ax = plt.subplots(figsize=(12, 5.4))
    values = [row['subscriptions'] for row in rows]
    plotted = ax.bar([row['name'] for row in rows], values,
                    color=[colors['primary']] + [colors['bar']] * (len(rows) - 1), width=.62)
    ax.bar_label(plotted, padding=6, color=colors['ink'])
    ax.set_ylim(0, max(values) * 1.2)
    ax.set_ylabel(label)
    ax.yaxis.grid(True, color=colors['grid'])
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.tick_params(axis='x', rotation=25, length=0)
    ax.tick_params(axis='y', length=0)
    save(fig, name)

bars(data['top_courses'], 'Subscribers', '01-courses')
bars(data['top_subjects'], 'Course subscriptions', '02-subjects')

fig, ax = plt.subplots(figsize=(12, 5.4))
hours = data['hourly_emails']
ax.bar(range(24), hours['OPEN'], color=colors['open'], label='Open seats', width=.72)
ax.bar(range(24), hours['WAITLIST'], bottom=hours['OPEN'], color=colors['waitlist'], label='Waitlist', width=.72)
ax.set_xticks(range(24), [f'{hour:02d}' for hour in range(24)], fontsize=11)
ax.set_xlabel('Hour')
ax.set_ylabel('Emails')
ax.yaxis.grid(True, color=colors['grid'])
ax.legend(frameon=False)
save(fig, '03-hourly-emails')

fig, ax = plt.subplots(figsize=(12, 5.4))
days = data['daily_notifications']
dates = [dt.date.fromisoformat(row['date']) for row in days]
ax.plot(dates, [row['emails'] for row in days], color=colors['line'], lw=2.4,
        marker='o', markersize=3.5)
ax.set_ylim(bottom=0)
ax.set_xlim(dates[0], dates[-1])
ax.set_ylabel('Daily emails')
ax.yaxis.grid(True, color=colors['grid'])
ax.yaxis.set_major_locator(MaxNLocator(integer=True))
ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
ax.xaxis.set_major_locator(mdates.AutoDateLocator(minticks=5, maxticks=8))
save(fig, '04-operations')

print(json.dumps({
    'top_course': data['top_courses'][0],
    'top_subject': data['top_subjects'][0],
    'daily_email_total': sum(row['emails'] for row in days),
    'august_31_through_add_deadline': sum(row['emails'] for row in days if '2026-08-31' <= row['date'] <= '2026-09-11'),
    'peak_day': max(days, key=lambda row: row['emails']),
}, ensure_ascii=False))
