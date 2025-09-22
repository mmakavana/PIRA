import React, { useState, useRef } from 'react';
import { Users, Plus, X, Settings, BarChart3, Calendar, Trash2 } from 'lucide-react';

// Simple input that manages its own state completely
const SimpleInput = React.memo(({ initialValue, onSubmit, placeholder, className, type = "text" }) => {
  const inputRef = useRef(null);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit(e.target.value);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      defaultValue={initialValue || ''}
      placeholder={placeholder}
      className={className}
      onKeyDown={handleKeyDown}
    />
  );
});

const ProjectManagementApp = () => {
  // Core state management
  const [activeTab, setActiveTab] = useState('unified');
  const [teams, setTeams] = useState([
    { id: 1, name: 'Development', members: ['John', 'Sarah', 'Mike'] },
    { id: 2, name: 'QA', members: ['Lisa', 'Tom'] },
    { id: 3, name: 'DevOps', members: ['Alex', 'Emma'] }
  ]);
  const [projects, setProjects] = useState([]);
  
  // Legend types - managed globally
  const [legendTypes, setLegendTypes] = useState([
    { id: 'start', name: 'Start Date', color: '#10B981', shape: 'diamond', size: 'small' },
    { id: 'due', name: 'Due Date', color: '#EF4444', shape: 'diamond', size: 'small' },
    { id: 'stabilization', name: 'Stabilization', color: '#3B82F6', shape: 'diamond', size: 'medium' },
    { id: 'complete', name: 'Complete', color: '#10B981', shape: 'diamond', size: 'medium' }
  ]);
  
  // Fixed color palette
  const projectColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E',
    '#A855F7', '#22C55E', '#EAB308', '#64748B'
  ];
  
  // Timeline settings - auto-calculate based on projects
  const calculateTimelineRange = () => {
    if (projects.length === 0) {
      const defaultStart = new Date();
      defaultStart.setMonth(defaultStart.getMonth() - 1);
      const defaultEnd = new Date();
      defaultEnd.setMonth(defaultEnd.getMonth() + 6);
      return { startDate: defaultStart, endDate: defaultEnd };
    }
    
    const allDates = projects.flatMap(p => [
      new Date(p.startDate),
      new Date(p.dueDate),
      ...(p.milestones || []).map(m => new Date(m.date))
    ]).filter(d => !isNaN(d));
    
    const earliest = new Date(Math.min(...allDates));
    const latest = new Date(Math.max(...allDates));
    
    // Add padding
    earliest.setDate(earliest.getDate() - 7);
    latest.setDate(latest.getDate() + 7);
    
    return { startDate: earliest, endDate: latest };
  };
  
  // Project management
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState({});
  const [editingMemberName, setEditingMemberName] = useState({});
  const [executiveMode, setExecutiveMode] = useState(false);
  const [selectedProjectColor, setSelectedProjectColor] = useState(projectColors[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Generate timeline columns with fixed width
  const generateTimelineColumns = () => {
    const range = calculateTimelineRange();
    const columns = [];
    const columnWidth = 80; // Fixed width
    
    const current = new Date(range.startDate);
    const end = new Date(range.endDate);
    
    // Generate weekly columns
    while (current <= end) {
      columns.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        width: columnWidth
      });
      current.setDate(current.getDate() + 7); // Weekly intervals
    }
    
    return columns;
  };

  // Status options
  const statusOptions = [
    { name: 'In Progress', color: '#3B82F6' },
    { name: 'Stabilization', color: '#F59E0B' },
    { name: 'On Hold', color: '#EF4444' },
    { name: 'Complete', color: '#10B981' }
  ];

  // Shape and color options for milestones
  const shapeOptions = ['diamond', 'circle', 'triangle', 'square', 'star'];

  const calculateTodayPosition = (columns) => {
    if (!columns.length) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timelineStart = columns[0].date;
    const timelineEnd = columns[columns.length - 1].date;
    
    if (today < timelineStart || today > timelineEnd) return null;
    
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const todayOffset = today.getTime() - timelineStart.getTime();
    
    return totalDuration > 0 ? (todayOffset / totalDuration) * 100 : 0;
  };

  const calculateProjectPosition = (project, columns) => {
    if (!columns.length) return { left: '0px', width: '20px' };
    
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.dueDate);
    const timelineStart = columns[0].date;
    const timelineEnd = columns[columns.length - 1].date;
    
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const totalWidth = columns.length * columns[0].width;
    
    const projectStartOffset = startDate.getTime() - timelineStart.getTime();
    const projectDuration = endDate.getTime() - startDate.getTime();
    
    const leftPixels = (projectStartOffset / totalDuration) * totalWidth;
    const widthPixels = Math.max(20, (projectDuration / totalDuration) * totalWidth);
    
    return { 
      left: `${Math.max(0, leftPixels)}px`, 
      width: `${widthPixels}px`
    };
  };

  // Update team name
  const updateTeamName = (teamId, newName) => {
    if (newName.trim()) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { ...team, name: newName.trim() }
          : team
      ));
      setEditingTeamName(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Update member name
  const updateMemberName = (teamId, oldName, newName) => {
    if (newName.trim()) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { 
              ...team, 
              members: team.members.map(member => 
                member === oldName ? newName.trim() : member
              ) 
            }
          : team
      ));
      setEditingMemberName(prev => ({ ...prev, [`${teamId}-${oldName}`]: false }));
    }
  };

  // Generate team tabs dynamically
  const teamTabs = teams.map(team => ({
    id: team.name.toLowerCase().replace(/\s+/g, '-'),
    label: team.name,
    teamId: team.id
  }));

  // Add new team
  const addTeam = (teamName) => {
    if (teamName && teamName.trim()) {
      const newTeam = {
        id: Date.now(),
        name: teamName.trim(),
        members: []
      };
      setTeams(prev => [...prev, newTeam]);
    }
  };

  // Delete team
  const deleteTeam = (teamId) => {
    setTeams(teams.filter(team => team.id !== teamId));
  };

  // Add member to team
  const addMemberToTeam = (teamId, memberName) => {
    if (memberName && memberName.trim()) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { ...team, members: [...team.members, memberName.trim()] }
          : team
      ));
    }
  };

  // Remove member from team
  const removeMemberFromTeam = (teamId, memberName) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, members: team.members.filter(member => member !== memberName) }
        : team
    ));
  };

  // Get all members across all teams
  const getAllMembers = () => {
    return teams.flatMap(team => 
      team.members.map(member => ({
        name: member,
        teamId: team.id,
        teamName: team.name
      }))
    );
  };

  const renderShape = (shape, color, size = 12) => {
    const shapeProps = {
      width: size,
      height: size,
      fill: color,
      stroke: '#000',
      strokeWidth: 1
    };

    switch (shape) {
      case 'diamond':
        return (
          <svg width={size} height={size} className="inline-block">
            <polygon points={`${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}`} {...shapeProps} />
          </svg>
        );
      case 'circle':
        return (
          <svg width={size} height={size} className="inline-block">
            <circle cx={size/2} cy={size/2} r={size/2-1} {...shapeProps} />
          </svg>
        );
      case 'triangle':
        return (
          <svg width={size} height={size} className="inline-block">
            <polygon points={`${size/2},2 ${size-2},${size-2} 2,${size-2}`} {...shapeProps} />
          </svg>
        );
      case 'square':
        return (
          <svg width={size} height={size} className="inline-block">
            <rect x="2" y="2" width={size-4} height={size-4} {...shapeProps} />
          </svg>
        );
      case 'star':
        return (
          <svg width={size} height={size} className="inline-block">
            <polygon points={`${size/2},2 ${size*0.6},${size*0.4} ${size-2},${size*0.4} ${size*0.7},${size*0.65} ${size*0.8},${size-2} ${size/2},${size*0.75} ${size*0.2},${size-2} ${size*0.3},${size*0.65} 2,${size*0.4} ${size*0.4},${size*0.4}`} {...shapeProps} />
          </svg>
        );
      default:
        return <div style={{width: size, height: size, backgroundColor: color, borderRadius: '50%'}} className="inline-block" />;
    }
  };

  // Simple Legend Display (for Unified/Team tabs)
  const LegendDisplay = () => (
    <div className="bg-white rounded-lg shadow-sm border p-3 mb-4">
      <div className="flex items-center gap-4">
        <span className="font-medium text-sm">Legend:</span>
        {legendTypes.map(type => (
          <div key={type.id} className="flex items-center gap-2">
            {renderShape(type.shape, type.color, type.size === 'small' ? 8 : type.size === 'medium' ? 12 : 16)}
            <span className="text-sm">{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Legend Editor (only for Projects tab)
  const LegendEditor = () => {
    const addMilestoneType = () => {
      const newType = {
        id: Date.now(),
        name: 'New Milestone',
        color: '#F59E0B',
        shape: 'diamond',
        size: 'small'
      };
      setLegendTypes(prev => [...prev, newType]);
    };

    const updateLegendType = (id, updates) => {
      setLegendTypes(prev => prev.map(type => 
        type.id === id ? { ...type, ...updates } : type
      ));
    };

    const deleteLegendType = (id) => {
      setLegendTypes(prev => prev.filter(type => type.id !== id));
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Legend Editor: Milestone Types</h3>
        
        <div className="space-y-3">
          {legendTypes.map(type => (
            <div key={type.id} className="flex items-center gap-4 p-2 border rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-16">Name</span>
                <input
                  type="text"
                  value={type.name}
                  onChange={(e) => updateLegendType(type.id, { name: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Color</span>
                <div 
                  className="w-6 h-4 border rounded cursor-pointer"
                  style={{ backgroundColor: type.color }}
                  onClick={() => {
                    const newColor = prompt('Enter hex color:', type.color);
                    if (newColor) updateLegendType(type.id, { color: newColor });
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Shape</span>
                <select
                  value={type.shape}
                  onChange={(e) => updateLegendType(type.id, { shape: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {shapeOptions.map(shape => (
                    <option key={shape} value={shape}>{shape}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Size</span>
                <select
                  value={type.size}
                  onChange={(e) => updateLegendType(type.id, { size: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="small">small</option>
                  <option value="medium">medium</option>
                  <option value="large">large</option>
                </select>
              </div>
              
              <button
                onClick={() => deleteLegendType(type.id)}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        
        <button
          onClick={addMilestoneType}
          className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          + Add Type
        </button>
      </div>
    );
  };

  // Team Management Component
  const TeamManagement = () => (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
      </div>

      {/* Add New Team */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Team
        </h3>
        <div className="flex gap-3">
          <SimpleInput
            placeholder="Team name"
            onSubmit={addTeam}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Team name"]');
              if (input && input.value.trim()) {
                addTeam(input.value);
                input.value = '';
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Team
          </button>
        </div>
      </div>

      {/* Teams List */}
      <div className="grid gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              {editingTeamName[team.id] ? (
                <input
                  type="text"
                  defaultValue={team.name}
                  onBlur={(e) => updateTeamName(team.id, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateTeamName(team.id, e.target.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingTeamName(prev => ({ ...prev, [team.id]: false }));
                    }
                  }}
                  className="text-lg font-semibold text-gray-800 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <h3 
                  className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                  onClick={() => setEditingTeamName(prev => ({ ...prev, [team.id]: true }))}
                  title="Click to edit team name"
                >
                  {team.name}
                </h3>
              )}
              <button
                onClick={() => deleteTeam(team.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Delete Team"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Team Members */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Members:</h4>
              <div className="flex flex-wrap gap-2">
                {team.members.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {editingMemberName[`${team.id}-${member}`] ? (
                      <input
                        type="text"
                        defaultValue={member}
                        onBlur={(e) => updateMemberName(team.id, member, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateMemberName(team.id, member, e.target.value);
                          }
                          if (e.key === 'Escape') {
                            setEditingMemberName(prev => ({ ...prev, [`${team.id}-${member}`]: false }));
                          }
                        }}
                        className="bg-white border border-gray-300 rounded px-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="cursor-pointer hover:text-blue-900"
                        onClick={() => setEditingMemberName(prev => ({ ...prev, [`${team.id}-${member}`]: true }))}
                        title="Click to edit member name"
                      >
                        {member}
                      </span>
                    )}
                    <button
                      onClick={() => removeMemberFromTeam(team.id, member)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {team.members.length === 0 && (
                  <span className="text-gray-500 italic">No members assigned</span>
                )}
              </div>
            </div>

            {/* Add Member */}
            <div className="flex gap-3">
              <SimpleInput
                placeholder="New member name"
                onSubmit={(value) => addMemberToTeam(team.id, value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const input = event.target.closest('.flex').querySelector('input[placeholder="New member name"]');
                  if (input && input.value.trim()) {
                    addMemberToTeam(team.id, input.value.trim());
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Project Management Component
  const ProjectManagement = () => (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Project Management</h2>
        <button
          onClick={() => setShowAddProject(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Legend Editor - Only in Projects tab */}
      <LegendEditor />

      {/* Add/Edit Project Form */}
      {showAddProject && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h3>
          
          <form id="projectForm" className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                name="name"
                type="text"
                defaultValue={editingProject?.name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  name="startDate"
                  type="date"
                  defaultValue={editingProject?.startDate || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={editingProject?.dueDate || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Members */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Members
                </label>
                <select
                  name="assignedMembers"
                  multiple
                  defaultValue={editingProject?.assignedMembers || []}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {getAllMembers().map(member => (
                    <option key={`${member.teamId}-${member.name}`} value={member.name}>
                      {member.name} ({member.teamName})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple members</p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  name="priority"
                  type="number"
                  defaultValue={editingProject?.priority || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 1, 2, 3..."
                />
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Color:
              </label>
              <div className="relative">
                <div
                  className="w-16 h-8 border-2 border-gray-300 rounded cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: selectedProjectColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  {selectedProjectColor === projectColors[1] && <span className="text-white">✓</span>}
                </div>
                
                {showColorPicker && (
                  <div className="absolute top-10 left-0 bg-white border shadow-lg rounded p-3 z-10">
                    <div className="grid grid-cols-8 gap-2 w-64">
                      {projectColors.map(color => (
                        <div
                          key={color}
                          className="w-8 h-8 rounded cursor-pointer border-2 hover:border-gray-400 flex items-center justify-center"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setSelectedProjectColor(color);
                            setShowColorPicker(false);
                          }}
                        >
                          {selectedProjectColor === color && (
                            <span className="text-white font-bold">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Milestones Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Milestones
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Milestone name:');
                    const date = prompt('Milestone date (YYYY-MM-DD):');
                    const legendType = legendTypes.find(t => t.name.toLowerCase() === name?.toLowerCase());
                    
                    if (name && date) {
                      const newMilestone = {
                        id: Date.now(),
                        name,
                        date,
                        legendTypeId: legendType?.id || legendTypes[0].id
                      };
                      
                      if (editingProject) {
                        const updatedProject = {
                          ...editingProject,
                          milestones: [...(editingProject.milestones || []), newMilestone]
                        };
                        setEditingProject(updatedProject);
                        setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                      }
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  + Add Milestone
                </button>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {((editingProject?.milestones) || []).map(milestone => {
                  const legendType = legendTypes.find(t => t.id === milestone.legendTypeId);
                  return (
                    <div key={milestone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <select
                          value={milestone.legendTypeId}
                          onChange={(e) => {
                        <select
                          value={milestone.legendTypeId}
                          onChange={(e) => {
                            const updatedMilestones = editingProject.milestones.map(m =>
                              m.id === milestone.id ? { ...m, legendTypeId: e.target.value } : m
                            );
                            const updatedProject = { ...editingProject, milestones: updatedMilestones };
                            setEditingProject(updatedProject);
                            setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                          }}
                          className="text-sm px-2 py-1 border rounded"
                        >
                          {legendTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={milestone.date}
                          onChange={(e) => {
                            const updatedMilestones = editingProject.milestones.map(m =>
                              m.id === milestone.id ? { ...m, date: e.target.value } : m
                            );
                            const updatedProject = { ...editingProject, milestones: updatedMilestones };
                            setEditingProject(updatedProject);
                            setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                          }}
                          className="text-sm px-2 py-1 border rounded"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedMilestones = editingProject.milestones.filter(m => m.id !== milestone.id);
                          const updatedProject = { ...editingProject, milestones: updatedMilestones };
                          setEditingProject(updatedProject);
                          setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddProject(false);
                setEditingProject(null);
                setShowColorPicker(false);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.getElementById('projectForm');
                const formData = new FormData(form);
                
                const projectData = {
                  id: editingProject ? editingProject.id : Date.now(),
                  name: formData.get('name'),
                  startDate: formData.get('startDate'),
                  dueDate: formData.get('dueDate'),
                  priority: formData.get('priority'),
                  assignedMembers: formData.getAll('assignedMembers'),
                  projectColor: selectedProjectColor,
                  milestones: editingProject ? editingProject.milestones || [] : []
                };

                if (!projectData.name || !projectData.startDate || !projectData.dueDate) {
                  alert('Please fill in required fields: Name, Start Date, and End Date');
                  return;
                }

                if (editingProject) {
                  setProjects(projects.map(p => p.id === editingProject.id ? projectData : p));
                } else {
                  setProjects(prev => [...prev, projectData]);
                }

                setShowAddProject(false);
                setEditingProject(null);
                setShowColorPicker(false);
                form.reset();
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              {editingProject ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">All Projects</h3>
        </div>
        
        {projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No projects created yet.</p>
            <button
              onClick={() => setShowAddProject(true)}
              className="mt-2 text-blue-500 hover:text-blue-700 font-medium"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects.map(project => (
              <div key={project.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-800">{project.name}</h4>
                      {project.priority && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                          Priority: {project.priority}
                        </span>
                      )}
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: project.projectColor }}
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                      <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                      <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                    </div>
                    
                    {project.assignedMembers.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm text-gray-500">Assigned:</span>
                        {project.assignedMembers.map(member => {
                          const memberData = getAllMembers().find(m => m.name === member);
                          return (
                            <span 
                              key={member}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                            >
                              {member}
                              {memberData && (
                                <span className="text-blue-600"> ({memberData.teamName})</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProject(project);
                        setSelectedProjectColor(project.projectColor);
                        setShowAddProject(true);
                      }}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Edit Project"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this project?')) {
                          setProjects(projects.filter(p => p.id !== project.id));
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Unified View Component
  const UnifiedView = () => {
    const columns = generateTimelineColumns();
    const todayPosition = calculateTodayPosition(columns);

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Unified Project Timeline</h2>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={executiveMode}
                onChange={(e) => setExecutiveMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Executive Mode</span>
            </label>
          </div>
        </div>

        {/* Legend Display */}
        <LegendDisplay />

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            <p>No projects to display.</p>
            <button
              onClick={() => setActiveTab('projects')}
              className="mt-2 text-blue-500 hover:text-blue-700 font-medium"
            >
              Add your first project
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-auto">
            {/* Header */}
            <div className="border-b bg-gray-50 p-4">
              <div className="flex">
                <div className="w-64 font-medium">All Projects</div>
                <div className="flex" style={{ minWidth: `${columns.length * 80}px` }}>
                  {columns.map((col, index) => (
                    <div 
                      key={index} 
                      className="border-r border-gray-200 text-center text-xs font-medium py-2"
                      style={{ width: `${col.width}px` }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="divide-y divide-gray-200">
              {projects.map((project, index) => {
                const position = calculateProjectPosition(project, columns);
                
                return (
                  <div key={project.id} className="flex items-center hover:bg-gray-50">
                    <div className="w-64 p-4">
                      <div className="text-sm font-medium">
                        {executiveMode ? `Project ${index + 1}` : project.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        {project.priority && <span>P{project.priority}</span>}
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: project.projectColor }}
                        />
                      </div>
                      {project.assignedMembers.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {executiveMode 
                            ? `${project.assignedMembers.length} resource${project.assignedMembers.length !== 1 ? 's' : ''}`
                            : project.assignedMembers.slice(0, 2).join(', ') + (project.assignedMembers.length > 2 ? '...' : '')
                          }
                        </div>
                      )}
                    </div>
                    
                    <div className="relative h-12" style={{ minWidth: `${columns.length * 80}px` }}>
                      {/* Grid lines */}
                      {columns.map((col, colIndex) => (
                        <div 
                          key={colIndex}
                          className="absolute border-r border-gray-200 h-full"
                          style={{ left: `${colIndex * 80}px`, width: '1px' }}
                        />
                      ))}
                      
                      {/* Today line */}
                      {todayPosition !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                          style={{ left: `${todayPosition}%` }}
                          title={`Today: ${new Date().toLocaleDateString()}`}
                        />
                      )}
                      
                      {/* Project Bar */}
                      <div
                        className="absolute top-1/2 transform -translate-y-1/2 h-4 rounded z-10"
                        style={{
                          left: position.left,
                          width: position.width,
                          backgroundColor: project.projectColor,
                          minWidth: '20px'
                        }}
                        title={`${project.name}: ${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.dueDate).toLocaleDateString()}`}
                      />

                      {/* Milestones */}
                      {(project.milestones || []).map((milestone) => {
                        const legendType = legendTypes.find(t => t.id === milestone.legendTypeId);
                        if (!legendType) return null;
                        
                        const milestoneDate = new Date(milestone.date);
                        const range = calculateTimelineRange();
                        const totalDuration = range.endDate.getTime() - range.startDate.getTime();
                        const milestoneOffset = milestoneDate.getTime() - range.startDate.getTime();
                        const milestoneLeftPixels = (milestoneOffset / totalDuration) * (columns.length * 80);

                        const size = legendType.size === 'small' ? 8 : legendType.size === 'medium' ? 12 : 16;

                        return (
                          <div
                            key={milestone.id}
                            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
                            style={{ left: `${milestoneLeftPixels}px` }}
                            title={`${legendType.name} - ${new Date(milestone.date).toLocaleDateString()}`}
                          >
                            {renderShape(legendType.shape, legendType.color, size)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const TeamView = ({ teamId }) => {
    const team = teams.find(t => t.id === teamId);
    const teamProjects = projects.filter(project => 
      project.assignedMembers.some(member => 
        team?.members.includes(member)
      )
    );
    
    const columns = generateTimelineColumns();
    const todayPosition = calculateTodayPosition(columns);

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{team?.name} Team Timeline</h2>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={executiveMode}
                onChange={(e) => setExecutiveMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Executive Mode</span>
            </label>
          </div>
        </div>

        {/* Legend Display */}
        <LegendDisplay />

        <div className="bg-white rounded-lg shadow-md overflow-auto">
          {/* Team Members & Their Projects */}
          <div className="border-b bg-gray-50 p-4">
            <div className="flex">
              <div className="w-64 font-medium">Team Members</div>
              <div className="flex" style={{ minWidth: `${columns.length * 80}px` }}>
                {columns.map((col, index) => (
                  <div 
                    key={index} 
                    className="border-r border-gray-200 text-center text-xs font-medium py-2"
                    style={{ width: `${col.width}px` }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {team?.members.map((member, memberIndex) => {
              const memberProjects = teamProjects.filter(project => 
                project.assignedMembers.includes(member)
              );

              return (
                <div key={member}>
                  {/* Member Header */}
                  <div className="bg-blue-50 border-b border-blue-100">
                    <div className="flex">
                      <div className="w-64 p-3 font-medium text-blue-800">
                        {executiveMode ? `Resource ${memberIndex + 1}` : member}
                        <span className="text-xs text-blue-600 block">
                          {memberProjects.length} project{memberProjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex-1" style={{ minWidth: `${columns.length * 80}px` }}></div>
                    </div>
                  </div>

                  {/* Member's Projects */}
                  {memberProjects.length === 0 ? (
                    <div className="flex">
                      <div className="w-64 p-4"></div>
                      <div className="flex-1 p-4 text-gray-500 text-sm">
                        No current projects assigned
                      </div>
                    </div>
                  ) : (
                    memberProjects.map((project, projectIndex) => {
                      const position = calculateProjectPosition(project, columns);
                      return (
                        <div key={project.id} className="flex items-center hover:bg-gray-50">
                          <div className="w-64 p-4 pl-8">
                            <div className="text-sm font-medium">
                              {executiveMode ? `Project ${projectIndex + 1}` : project.name}
                            </div>
                            {project.priority && (
                              <div className="text-xs text-gray-500">Priority: {project.priority}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              {new Date(project.startDate).toLocaleDateString()} - {new Date(project.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="relative h-12" style={{ minWidth: `${columns.length * 80}px` }}>
                            {/* Grid lines */}
                            {columns.map((col, index) => (
                              <div 
                                key={index}
                                className="absolute border-r border-gray-200 h-full"
                                style={{ left: `${index * 80}px`, width: '1px' }}
                              />
                            ))}
                            
                            {/* Today line */}
                            {todayPosition !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                                style={{ left: `${todayPosition}%` }}
                                title={`Today: ${new Date().toLocaleDateString()}`}
                              />
                            )}
                            
                            {/* Project Bar */}
                            <div
                              className="absolute top-1/2 transform -translate-y-1/2 h-4 rounded z-10"
                              style={{
                                left: position.left,
                                width: position.width,
                                backgroundColor: project.projectColor,
                                minWidth: '20px'
                              }}
                              title={`${project.name}: ${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.dueDate).toLocaleDateString()}`}
                            />

                            {/* Milestones */}
                            {(project.milestones || []).map((milestone) => {
                              const legendType = legendTypes.find(t => t.id === milestone.legendTypeId);
                              if (!legendType) return null;
                              
                              const milestoneDate = new Date(milestone.date);
                              const range = calculateTimelineRange();
                              const totalDuration = range.endDate.getTime() - range.startDate.getTime();
                              const milestoneOffset = milestoneDate.getTime() - range.startDate.getTime();
                              const milestoneLeftPixels = (milestoneOffset / totalDuration) * (columns.length * 80);

                              const size = legendType.size === 'small' ? 8 : legendType.size === 'medium' ? 12 : 16;

                              return (
                                <div
                                  key={milestone.id}
                                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
                                  style={{ left: `${milestoneLeftPixels}px` }}
                                  title={`${legendType.name} - ${new Date(milestone.date).toLocaleDateString()}`}
                                >
                                  {renderShape(legendType.shape, legendType.color, size)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const Reports = () => (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Reports & Analytics</h2>
      <p className="text-gray-600">Comprehensive reporting suite will be built in a later section.</p>
    </div>
  );

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'unified':
        return <UnifiedView />;
      case 'teams':
        return <TeamManagement />;
      case 'projects':
        return <ProjectManagement />;
      case 'reports':
        return <Reports />;
      default:
        const teamTab = teamTabs.find(tab => tab.id === activeTab);
        if (teamTab) {
          return <TeamView teamId={teamTab.teamId} />;
        }
        return <UnifiedView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 bg-clip-text text-transparent mb-2">
              PIRA
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Project IT Resource Availability
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/70 backdrop-blur-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('unified')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'unified' 
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Unified View
            </button>

            {teamTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}

            <button
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'teams' 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Teams
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'projects' 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Projects
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'reports' 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Reports
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default ProjectManagementApp;
