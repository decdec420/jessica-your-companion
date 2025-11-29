import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Upload, 
  X, 
  MoreHorizontal,
  Calendar,
  Users,
  Tag,
  Search,
  Filter,
  Download,
  Share,
  Archive,
  Trash2,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getProjects,
  createProject,
  getProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  type Project as DBProject,
  type ProjectFile as DBProjectFile,
} from "@/lib/database";
import { formatDistanceToNow } from "date-fns";

// Extended Project interface with files
interface Project extends DBProject {
  files: DBProjectFile[];
  color: string;
}

const colorOptions = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

const ProjectsInterface = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    tagInput: ''
  });

  // Load projects from database
  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const dbProjects = await getProjects();
      
      // Load files for each project and assign colors
      const projectsWithFiles = await Promise.all(
        dbProjects.map(async (project, index) => {
          const files = await getProjectFiles(project.id);
          return {
            ...project,
            files,
            color: colorOptions[index % colorOptions.length],
          };
        })
      );

      setProjects(projectsWithFiles);
      if (projectsWithFiles.length > 0 && !selectedProject) {
        setSelectedProject(projectsWithFiles[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error loading projects",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) return;

    try {
      const created = await createProject({
        title: newProject.title,
        description: newProject.description,
        tags: newProject.tags,
      });

      if (created) {
        const projectWithFiles: Project = {
          ...created,
          files: [],
          color: colorOptions[projects.length % colorOptions.length],
        };
        setProjects((prev) => [projectWithFiles, ...prev]);
        setSelectedProject(projectWithFiles);
        setIsCreatingProject(false);
        setNewProject({ title: '', description: '', tags: [], tagInput: '' });
        toast({
          title: "Project created!",
          description: `${created.title} has been added to your workspace.`,
        });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) {
      return <File className="w-4 h-4 text-green-500" />;
    } else if (mimeType.includes('pdf')) {
      return <File className="w-4 h-4 text-red-500" />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <File className="w-4 h-4 text-green-600" />;
    } else if (mimeType.includes('code') || mimeType.includes('text')) {
      return <File className="w-4 h-4 text-blue-500" />;
    } else {
      return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && selectedProject) {
      setIsUploading(true);
      try {
        const uploadPromises = Array.from(files).map(file => uploadProjectFile(selectedProject.id, file));
        const uploadedFiles = await Promise.all(uploadPromises);
        
        const successfulUploads = uploadedFiles.filter((f): f is DBProjectFile => f !== null);

        if (successfulUploads.length > 0) {
          // Update projects state
          setProjects((prev) =>
            prev.map((p) =>
              p.id === selectedProject.id
                ? { ...p, files: [...p.files, ...successfulUploads], updated_at: new Date().toISOString() }
                : p
            )
          );

          // Update selected project
          setSelectedProject((prev) =>
            prev
              ? { ...prev, files: [...prev.files, ...successfulUploads], updated_at: new Date().toISOString() }
              : null
          );

          toast({
            title: "Files uploaded!",
            description: `${successfulUploads.length} file(s) uploaded successfully.`,
          });
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        toast({
          title: "Upload failed",
          description: "Some files could not be uploaded.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedProject) return;

    try {
      const success = await deleteProjectFile(fileId);
      if (success) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === selectedProject.id
              ? { ...p, files: p.files.filter((f) => f.id !== fileId) }
              : p
          )
        );

        setSelectedProject((prev) =>
          prev
            ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) }
            : null
        );

        toast({
          title: "File deleted",
          description: "The file has been removed from your project.",
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the file.",
        variant: "destructive",
      });
    }
  };

  const addTag = () => {
    if (newProject.tagInput.trim() && !newProject.tags.includes(newProject.tagInput.trim())) {
      setNewProject(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewProject(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full bg-slate-50">
      {/* Projects Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Projects</h2>
            <Button 
              size="sm" 
              onClick={() => setIsCreatingProject(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedProject?.id === project.id 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded ${project.color} mt-1 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{project.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-2">{project.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>{project.files.length} files</span>
                        <span>{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
                      </div>

                      {project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {project.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{project.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isCreatingProject ? (
          <div className="p-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Project</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsCreatingProject(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Project Name
                  </label>
                  <Input
                    value={newProject.title}
                    onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter project name..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your project..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Tags
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newProject.tagInput}
                      onChange={(e) => setNewProject(prev => ({ ...prev, tagInput: e.target.value }))}
                      placeholder="Add a tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  {newProject.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newProject.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreatingProject(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProject.title.trim()}>
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedProject ? (
          <div className="flex-1 flex flex-col">
            {/* Project Header */}
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-4 h-4 rounded ${selectedProject.color} mt-1`} />
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                      {selectedProject.title}
                    </h1>
                    <p className="text-slate-600 mb-3">{selectedProject.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Created {formatDistanceToNow(new Date(selectedProject.created_at), { addSuffix: true })}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {selectedProject.files.length} files
                      </div>
                    </div>

                    {selectedProject.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedProject.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Share className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Files Section */}
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Project Files</h2>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.xls,.xlsx,.csv,.fig,.sketch"
                  />
                  <Button onClick={handleFileUpload} variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-1" />
                    Upload Files
                  </Button>
                </div>
              </div>

              {selectedProject.files.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
                  <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No files yet</h3>
                  <p className="text-slate-600 mb-4">
                    Upload files to share them with Jessica for project-specific assistance.
                  </p>
                  <Button onClick={handleFileUpload} className="bg-gradient-to-r from-purple-600 to-blue-600">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First File
                  </Button>
                  <p className="text-xs text-slate-500 mt-3">
                    Supports: PDF, DOC, TXT, Images, Spreadsheets, Design Files (20 files max, 10MB each)
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedProject.files.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.mime_type)}
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {file.name}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteFile(file.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="text-xs text-slate-500 space-y-1">
                          <div>Size: {formatFileSize(file.file_size)}</div>
                          <div>Uploaded: {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}</div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a Project</h2>
              <p className="text-slate-600">Choose a project from the sidebar to view its details and files.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsInterface;
