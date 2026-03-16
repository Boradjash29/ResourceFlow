import api from '../lib/api';
import StatsGrid from '../components/dashboard/StatsGrid';
import UtilizationChart from '../components/dashboard/UtilizationChart';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, utilRes, popRes] = await Promise.all([
          api.get('/analytics/stats'),
          api.get('/analytics/utilization'),
          api.get('/analytics/popular')
        ]);
        setStats(statsRes.data);
        setUtilization(utilRes.data);
        setPopular(popRes.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Dashboard</h1>
          <p className="text-gray-600">Overview of resource availability and scheduling trends.</p>
        </header>

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <UtilizationChart data={utilization} />
          </div>
          
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-gray-900">Popular Resources</h3>
            </div>
            <div className="space-y-4">
              {popular.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-1 text-primary">
                    <Calendar className="w-3 h-3" />
                    <span className="text-sm font-bold">{item.booking_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
