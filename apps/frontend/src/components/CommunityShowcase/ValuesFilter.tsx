/**
 * 🌟 Values Filter Component
 * Advanced filtering system for ACT's revolutionary showcase
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Zap, Eye, MapPin, Tag, Filter } from 'lucide-react';
import { ACTValues } from './ProjectCard';

interface ValuesFilterProps {
  values: Partial<ACTValues>;
  onValuesChange: (values: Partial<ACTValues>) => void;
  projectTypes: string[];
  selectedProjectTypes: string[];
  onProjectTypesChange: (types: string[]) => void;
  locations: string[];
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;
  tags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export const ValuesFilter: React.FC<ValuesFilterProps> = ({
  values,
  onValuesChange,
  projectTypes,
  selectedProjectTypes,
  onProjectTypesChange,
  locations,
  selectedLocations,
  onLocationsChange,
  tags,
  selectedTags,
  onTagsChange
}) => {
  const valuesConfig = [
    {
      key: 'radicalHumility' as keyof ACTValues,
      label: 'Radical Humility',
      description: 'Deep listening, community-led solutions',
      icon: Heart,
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      key: 'decentralizedPower' as keyof ACTValues,
      label: 'Decentralized Power',
      description: 'Communities own and control their development',
      icon: Users,
      color: 'text-teal-600 bg-teal-50 border-teal-200'
    },
    {
      key: 'creativityAsDisruption' as keyof ACTValues,
      label: 'Creativity as Disruption',
      description: 'Art and innovation challenge systems',
      icon: Zap,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      key: 'uncomfortableTruthTelling' as keyof ACTValues,
      label: 'Uncomfortable Truth-Telling',
      description: 'Honest confrontation of systemic issues',
      icon: Eye,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    }
  ];

  const projectTypeLabels = {
    'community-ownership': '🌱 Community Ownership',
    'systemic-change': '🔥 Systemic Change',
    'collaboration-web': '🤝 Collaboration Web'
  };

  const toggleValue = (key: keyof ACTValues) => {
    onValuesChange({
      ...values,
      [key]: !values[key]
    });
  };

  const toggleArrayItem = <T extends string>(
    array: T[],
    item: T,
    onChange: (newArray: T[]) => void
  ) => {
    if (array.includes(item)) {
      onChange(array.filter(i => i !== item));
    } else {
      onChange([...array, item]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* ACT Values */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-emerald-600" />
          ACT Values
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {valuesConfig.map((valueConfig) => {
            const IconComponent = valueConfig.icon;
            const isSelected = values[valueConfig.key];
            
            return (
              <motion.button
                key={valueConfig.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleValue(valueConfig.key)}
                className={`
                  p-4 rounded-xl border-2 transition-all text-left
                  ${isSelected 
                    ? valueConfig.color + ' border-opacity-50' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center mb-2">
                  <IconComponent className={`w-5 h-5 mr-2 ${isSelected ? valueConfig.color.split(' ')[0] : 'text-gray-400'}`} />
                  <span className={`font-medium ${isSelected ? valueConfig.color.split(' ')[0] : 'text-gray-700'}`}>
                    {valueConfig.label}
                  </span>
                </div>
                <p className={`text-sm ${isSelected ? 'text-gray-700' : 'text-gray-500'}`}>
                  {valueConfig.description}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Project Types */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-emerald-600" />
          Project Types
        </h3>
        <div className="flex flex-wrap gap-3">
          {projectTypes.map((type) => {
            const isSelected = selectedProjectTypes.includes(type);
            const label = projectTypeLabels[type as keyof typeof projectTypeLabels] || type;
            
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleArrayItem(selectedProjectTypes, type, onProjectTypesChange)}
                className={`
                  px-4 py-2 rounded-full border-2 transition-all font-medium
                  ${isSelected
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Locations */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
          Locations
        </h3>
        <div className="flex flex-wrap gap-2">
          {locations.map((location) => {
            const isSelected = selectedLocations.includes(location);
            
            return (
              <motion.button
                key={location}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleArrayItem(selectedLocations, location, onLocationsChange)}
                className={`
                  px-3 py-2 rounded-lg border transition-all text-sm
                  ${isSelected
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                {location}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Tag className="w-5 h-5 mr-2 text-emerald-600" />
          Impact Areas
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 20).map((tag) => {
            const isSelected = selectedTags.includes(tag);
            
            return (
              <motion.button
                key={tag}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleArrayItem(selectedTags, tag, onTagsChange)}
                className={`
                  px-3 py-1 rounded-full border text-sm transition-all
                  ${isSelected
                    ? 'bg-purple-100 border-purple-300 text-purple-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                {tag}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default ValuesFilter;