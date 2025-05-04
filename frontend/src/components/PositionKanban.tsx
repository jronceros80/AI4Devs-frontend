import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import { ArrowLeft, PersonFill, GripVertical, InfoCircle, ArrowsExpand, ArrowsCollapse } from 'react-bootstrap-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getInterviewFlow, 
  getCandidates, 
  updateCandidateStage,
  InterviewStep,
  Candidate
} from '../services/positionService';
import '../styles/PositionKanban.css';

/**
 * Componente principal que muestra el tablero Kanban de candidatos para una posición
 */
const PositionKanban: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [positionName, setPositionName] = useState<string>('');
  const [interviewSteps, setInterviewSteps] = useState<InterviewStep[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [loadingInterviewFlow, setLoadingInterviewFlow] = useState<boolean>(true);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(true);
  const [updatingCandidate, setUpdatingCandidate] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState<boolean>(true);
  const kanbanRef = useRef<HTMLDivElement>(null);
  
  // Mapa para facilitar la búsqueda de pasos por nombre
  const stepsByName = useMemo(() => {
    const map = new Map<string, InterviewStep>();
    interviewSteps.forEach(step => map.set(step.name, step));
    return map;
  }, [interviewSteps]);

  // Mapa para facilitar la búsqueda de pasos por ID
  const stepsById = useMemo(() => {
    const map = new Map<string, InterviewStep>();
    interviewSteps.forEach(step => map.set(step.id, step));
    return map;
  }, [interviewSteps]);

  // Detectar si estamos en un dispositivo móvil
  const isMobile = useMemo(() => {
    return window.innerWidth <= 576;
  }, []);

  // Cargar el flujo de entrevistas
  useEffect(() => {
    const fetchInterviewFlow = async () => {
      if (!id) return;
      
      try {
        setLoadingInterviewFlow(true);
        setError('');
        const flowData = await getInterviewFlow(id);
        setPositionName(flowData.positionName);
        setInterviewSteps(flowData.interviewSteps);
      } catch (err) {
        setError('Error al cargar el flujo de entrevistas. Por favor, inténtelo de nuevo.');
        console.error(err);
      } finally {
        setLoadingInterviewFlow(false);
      }
    };
    
    fetchInterviewFlow();
  }, [id]);

  // Cargar candidatos
  useEffect(() => {
    const fetchCandidates = async () => {
      if (!id) return;
      
      try {
        setLoadingCandidates(true);
        setError('');
        const candidatesData = await getCandidates(id);
        
        // Verificar que hay fases válidas antes de cargar candidatos
        if (interviewSteps.length === 0) {
          console.warn('Se intentó cargar candidatos pero no hay fases disponibles');
        }
        
        setCandidates(candidatesData);
      } catch (err) {
        setError('Error al cargar los candidatos. Por favor, inténtelo de nuevo.');
        console.error(err);
      } finally {
        setLoadingCandidates(false);
      }
    };
    
    // Solo cargar candidatos cuando ya tenemos las fases de entrevista
    if (!loadingInterviewFlow && interviewSteps.length > 0) {
      fetchCandidates();
    }
  }, [id, interviewSteps, loadingInterviewFlow]);

  // Detectar cambios de tamaño de la ventana para ajustar el modo de vista
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 576;
      if (mobile) {
        setExpandedView(false); // En móviles, iniciar con vista compacta
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Comprobar al inicio
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Determinar cuando se ha completado toda la carga
  useEffect(() => {
    setLoading(loadingInterviewFlow || loadingCandidates);
  }, [loadingInterviewFlow, loadingCandidates]);

  // Función para encontrar candidatos por fase
  const getCandidatesByStep = useCallback((stepName: string) => {
    return candidates.filter(candidate => candidate.currentInterviewStep === stepName);
  }, [candidates]);

  // Función para contar candidatos por fase
  const getCandidateCountByStep = useCallback((stepName: string) => {
    return getCandidatesByStep(stepName).length;
  }, [getCandidatesByStep]);

  // Función para desplazarse a una fase específica (útil en móviles)
  const scrollToPhase = useCallback((stepId: string) => {
    if (kanbanRef.current && isMobile) {
      const phaseElement = document.getElementById(`phase-${stepId}`);
      if (phaseElement) {
        phaseElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isMobile]);

  // Manejador para inicio de arrastre
  const handleDragStart = (e: React.DragEvent, candidateId: string, stepName: string) => {
    // Añadir datos necesarios para el arrastre
    e.dataTransfer.setData('candidateId', candidateId);
    
    // Establecer el efecto visual para indicar que se puede mover
    e.dataTransfer.effectAllowed = 'move';
    
    // Añadir una clase al elemento que se arrastra para estilizarlo
    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');
    
    // Establecer la fase actual como referencia
    setCurrentPhase(stepName);
    
    // Opcional: crear una imagen fantasma personalizada para el arrastre
    const ghost = document.createElement('div');
    ghost.classList.add('drag-ghost');
    ghost.textContent = 'Moviendo candidato...';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    
    // Limpiar el elemento fantasma después
    setTimeout(() => {
      if (ghost.parentNode) {
        document.body.removeChild(ghost);
      }
    }, 0);
  };

  // Manejador para fin de arrastre
  const handleDragEnd = (e: React.DragEvent) => {
    // Quitar la clase de arrastre
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging');
    
    // Limpiar efectos visuales en todas las columnas
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    // Limpiar la fase actual
    setCurrentPhase(null);
  };

  // Permitir soltar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Indicar que se permite soltar aquí
    e.dataTransfer.dropEffect = 'move';
    
    // Buscar el elemento columna en la jerarquía
    const columnEl = (e.currentTarget as HTMLElement).closest('.kanban-column');
    if (columnEl) {
      columnEl.classList.add('drag-over');
    }
  };

  // Quitar clases al salir
  const handleDragLeave = (e: React.DragEvent) => {
    // Buscar el elemento columna en la jerarquía
    const columnEl = (e.currentTarget as HTMLElement).closest('.kanban-column');
    if (columnEl) {
      const rect = columnEl.getBoundingClientRect();
      
      // Solo quitar la clase si realmente salimos de la columna (no de un elemento hijo)
      if (
        e.clientX < rect.left ||
        e.clientX >= rect.right ||
        e.clientY < rect.top ||
        e.clientY >= rect.bottom
      ) {
        columnEl.classList.remove('drag-over');
      }
    }
  };

  // Manejar soltar candidato en nueva columna
  const handleDrop = async (e: React.DragEvent, newStepId: string, newStepName: string) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('candidateId');
    
    // Limpiar efectos visuales
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    // Verificar que el candidato existe
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      setError('No se pudo encontrar el candidato seleccionado');
      return;
    }
    
    // Verificar si el candidato ya está en esta fase
    if (candidate.currentInterviewStep === newStepName) {
      return; // No hacer nada si está en la misma fase
    }
    
    // Indicar que estamos actualizando este candidato
    setUpdatingCandidate(candidateId);
    
    // Actualizar en el backend
    try {
      // Realizar la llamada al endpoint PUT /candidates/:id/stage
      await updateCandidateStage(candidateId, candidateId, newStepId);
      
      // Actualizar estado local
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === candidateId 
            ? { ...candidate, currentInterviewStep: newStepName }
            : candidate
        )
      );
      
      // Mostrar mensaje de éxito
      setSuccessMessage(`Candidato ${candidate.fullName} movido a ${newStepName}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      // Mostrar mensaje de error
      setError('Error al actualizar la fase del candidato. Inténtelo de nuevo.');
      setTimeout(() => setError(''), 5000);
    } finally {
      // Finalizar la actualización
      setUpdatingCandidate(null);
    }
  };

  // Alternar entre vista expandida y compacta
  const toggleExpandedView = () => {
    setExpandedView(!expandedView);
  };

  // Navegar de vuelta a la lista de posiciones
  const handleBack = () => {
    navigate('/positions');
  };

  // Mostrar indicador de carga
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3">Cargando información...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="position-kanban mt-4">
      {/* Header con título y botón de regreso */}
      <Row className="position-header mb-4">
        <Col xs={12} md={6}>
          <div className="d-flex align-items-center">
            <ArrowLeft 
              size={24} 
              className="back-arrow mr-3" 
              onClick={handleBack}
              role="button"
              aria-label="Volver a posiciones"
            />
            <h2 className="mb-0">{positionName}</h2>
            <Badge bg="info" className="ms-3">
              {candidates.length} candidatos
            </Badge>
          </div>
        </Col>
        <Col xs={12} md={6} className="d-flex justify-content-md-end justify-content-start mt-3 mt-md-0">
          {!isMobile && (
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={toggleExpandedView}
              className="me-2"
            >
              {expandedView ? (
                <>
                  <ArrowsCollapse className="me-1" /> Compactar
                </>
              ) : (
                <>
                  <ArrowsExpand className="me-1" /> Expandir
                </>
              )}
            </Button>
          )}
          {isMobile && interviewSteps.length > 0 && (
            <div className="d-flex justify-content-between w-100 flex-wrap phase-navigation">
              {interviewSteps.map(step => (
                <Button
                  key={step.id}
                  variant="outline-primary"
                  size="sm"
                  className="me-1 mb-1 phase-nav-btn"
                  onClick={() => scrollToPhase(step.id)}
                >
                  {step.name} <Badge bg="secondary" pill>{getCandidateCountByStep(step.name)}</Badge>
                </Button>
              ))}
            </div>
          )}
        </Col>
      </Row>

      {/* Alertas de éxito o error */}
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tablero Kanban */}
      <div 
        ref={kanbanRef}
        className={`kanban-board ${expandedView ? 'expanded-view' : 'compact-view'}`}
      >
        {interviewSteps.length > 0 ? (
          interviewSteps.map(step => (
            <div 
              key={step.id}
              id={`phase-${step.id}`}
              className={`kanban-column ${currentPhase === step.name ? 'current-phase' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, step.id, step.name)}
            >
              <div className="column-header">
                {step.name}
                <Badge bg="secondary" className="ms-2" pill>
                  {getCandidateCountByStep(step.name)}
                </Badge>
              </div>
              <div className="column-content">
                {getCandidatesByStep(step.name).length > 0 ? (
                  getCandidatesByStep(step.name).map(candidate => (
                    <Card 
                      key={candidate.id}
                      className={`candidate-card mb-2 ${updatingCandidate === candidate.id ? 'updating' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, candidate.id, step.name)}
                      onDragEnd={handleDragEnd}
                    >
                      <Card.Body>
                        <div className="drag-handle">
                          <GripVertical size={16} />
                        </div>
                        <Card.Title className="d-flex align-items-center">
                          <PersonFill className="me-2" />
                          {candidate.fullName}
                        </Card.Title>
                        <Card.Text>
                          Puntuación: <span className={`score-badge ${candidate.averageScore >= 4 ? 'high-score' : candidate.averageScore >= 3 ? 'medium-score' : 'low-score'}`}>
                            {candidate.averageScore.toFixed(1)}
                          </span>
                        </Card.Text>
                        {updatingCandidate === candidate.id && (
                          <div className="updating-overlay d-flex justify-content-center align-items-center">
                            <Spinner animation="border" size="sm" />
                            <span className="ms-2">Actualizando...</span>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-muted p-3">
                    <InfoCircle size={20} className="mb-2" />
                    <p className="mb-0">No hay candidatos en esta fase</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-4 w-100">
            <p>No se encontraron fases para este proceso de entrevistas</p>
          </div>
        )}
      </div>
    </Container>
  );
};

export default PositionKanban;