import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

const ResourceCard = ({ resource, onBook }) => {
  const typeIcons = {
    meeting_room: <Users className="w-4 h-4" />,
    projector: <Tag className="w-4 h-4" />,
    laptop: <Tag className="w-4 h-4" />,
    conference_hall: <Users className="w-4 h-4" />,
    other: <Tag className="w-4 h-4" />
  };

  const statusColors = {
    available: 'bg-green-100 text-green-700 border-green-200',
    unavailable: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <div className="card h-full flex flex-col">
        {resource.image_url && (
          <div className="w-full h-40 rounded-lg overflow-hidden mb-4">
            <img 
              src={resource.image_url} 
              alt={resource.name} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{resource.name}</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusColors[resource.status]}`}>
            {resource.status}
          </span>
        </div>

        <div className="space-y-2 mb-6 flex-grow">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="capitalize">{resource.type.replace('_', ' ')}</span>
          </div>
          {resource.capacity > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-gray-400" />
              <span>Up to {resource.capacity} people</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="line-clamp-1">{resource.location}</span>
          </div>
        </div>

        <button 
          onClick={() => onBook(resource)}
          disabled={resource.status === 'unavailable'}
          className={`btn w-full ${resource.status === 'unavailable' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'btn-primary'}`}
        >
          {resource.status === 'unavailable' ? 'Currently Unavailable' : 'Book Now'}
        </button>
      </div>
    </motion.div>
  );
};

export default ResourceCard;
