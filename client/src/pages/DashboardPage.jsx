import { useAuth } from '../features/auth/AuthContext';

const ROLE_CONFIG = {
  ADMIN: {
    title: 'Administrator Dashboard',
    subtitle: 'Manage users, monitor activity, and generate reports.',
    cards: [
      { title: 'User Management', description: 'Create, edit, and manage user accounts across all portals.', icon: 'group', color: 'bg-primary-container/20 text-primary' },
      { title: 'Reports', description: 'Generate Excel and PDF reports for user data and system activity.', icon: 'assessment', color: 'bg-green-100 text-green-700' },
      { title: 'System Settings', description: 'Configure platform settings and security policies.', icon: 'settings', color: 'bg-blue-100 text-blue-700' },
      { title: 'Activity Logs', description: 'View recent login activity and system events.', icon: 'history', color: 'bg-purple-100 text-purple-700' },
    ],
  },
  EXPERT: {
    title: 'Expert Portal',
    subtitle: 'Access your teaching resources, schedule, and student progress.',
    cards: [
      { title: 'My Courses', description: 'Manage and update your assigned courses and materials.', icon: 'menu_book', color: 'bg-primary-container/20 text-primary' },
      { title: 'Student Progress', description: 'Track student performance and assessment results.', icon: 'trending_up', color: 'bg-green-100 text-green-700' },
      { title: 'Schedule', description: 'View and manage your teaching schedule and events.', icon: 'calendar_month', color: 'bg-blue-100 text-blue-700' },
      { title: 'Resources', description: 'Upload and organize teaching materials.', icon: 'folder_open', color: 'bg-orange-100 text-orange-700' },
    ],
  },
  STREAM_LAB: {
    title: 'STREAM Hub',
    subtitle: 'Explore experiments, simulations, and lab resources.',
    cards: [
      { title: 'Experiments', description: 'Browse and launch available lab experiments.', icon: 'science', color: 'bg-primary-container/20 text-primary' },
      { title: 'Simulations', description: 'Run interactive STREAM simulations and models.', icon: 'play_circle', color: 'bg-teal-100 text-teal-700' },
      { title: 'Lab Equipment', description: 'Check availability and reserve lab equipment.', icon: 'precision_manufacturing', color: 'bg-indigo-100 text-indigo-700' },
      { title: 'Lab Reports', description: 'Submit and review lab experiment reports.', icon: 'lab_profile', color: 'bg-amber-100 text-amber-700' },
    ],
  },
  ILAB_SCHOOL: {
    title: 'iLab School',
    subtitle: 'Access school management, enrollment, and academic tools.',
    cards: [
      { title: 'Enrollment', description: 'Manage student enrollment and class assignments.', icon: 'how_to_reg', color: 'bg-primary-container/20 text-primary' },
      { title: 'Academics', description: 'View curriculum, grades, and academic performance.', icon: 'school', color: 'bg-green-100 text-green-700' },
      { title: 'Attendance', description: 'Track and manage student attendance records.', icon: 'event_available', color: 'bg-blue-100 text-blue-700' },
      { title: 'Communications', description: 'Send announcements and messages to parents.', icon: 'forum', color: 'bg-rose-100 text-rose-700' },
    ],
  },
  CREATIVE_CORNER: {
    title: 'Creative Corner',
    subtitle: 'Express yourself through art, music, design, and media.',
    cards: [
      { title: 'Art Gallery', description: 'Showcase and browse student creative works.', icon: 'palette', color: 'bg-primary-container/20 text-primary' },
      { title: 'Music Studio', description: 'Access music creation tools and resources.', icon: 'music_note', color: 'bg-pink-100 text-pink-700' },
      { title: 'Design Lab', description: 'Create digital designs and visual projects.', icon: 'draw', color: 'bg-cyan-100 text-cyan-700' },
      { title: 'Media Center', description: 'Produce and edit photos, videos, and podcasts.', icon: 'videocam', color: 'bg-yellow-100 text-yellow-700' },
    ],
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const config = ROLE_CONFIG[user?.role] || ROLE_CONFIG.EXPERT;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-10 animate-fade-in-up">
        <h1
          className="text-3xl md:text-4xl font-black text-on-surface tracking-tight mb-2"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          {config.title}
        </h1>
        <p className="text-secondary text-lg">{config.subtitle}</p>
      </div>

      {/* Quick Stats (Admin Only) */}
      {user?.role === 'ADMIN' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {[
            { label: 'Total Users', value: '—', icon: 'group', change: '' },
            { label: 'Active Today', value: '—', icon: 'verified', change: '' },
            { label: 'New This Week', value: '—', icon: 'person_add', change: '' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-black/[0.04] rounded-2xl p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-primary-container/15 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">{stat.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-black text-on-surface">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config.cards.map((card, index) => (
          <div
            key={card.title}
            className="bg-white border border-black/[0.04] rounded-2xl p-8 hover:shadow-lg hover:shadow-black/[0.03] hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: `${(index + 2) * 0.08}s` }}
          >
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}
              >
                {card.icon}
              </span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">{card.title}</h3>
            <p className="text-secondary text-sm leading-relaxed">{card.description}</p>
            <div className="mt-5 flex items-center gap-1 text-primary font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Open
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
