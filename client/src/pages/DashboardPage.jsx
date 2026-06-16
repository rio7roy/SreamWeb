import { useAuth } from '../features/auth/AuthContext';

const ROLE_CONFIG = {
  ADMIN: {
    title: 'Administrator Dashboard',
    subtitle: 'Manage users, monitor activity, and generate reports.',
    cards: [
      { title: 'User Management', description: 'Create, edit, and manage user accounts across all portals.', icon: 'group', color: 'bg-primary-container/20 text-primary' },
      { title: 'Reports', description: 'Generate Excel and PDF reports for user data and system activity.', icon: 'assessment', color: 'bg-green-100 text-green-700' },
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

      <div className="bg-white border border-black/[0.04] rounded-2xl p-12 text-center text-secondary">
        <span className="material-symbols-outlined text-5xl mb-4 opacity-30">construction</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Under Construction</h2>
        <p>Specific features for your role are currently being built.</p>
      </div>
    </div>
  );
}
