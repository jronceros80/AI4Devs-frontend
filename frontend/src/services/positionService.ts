import axios from 'axios';

// Interfaces
export interface InterviewStep {
  id: string;
  name: string;
}

export interface PositionInterviewFlow {
  positionName: string;
  interviewSteps: InterviewStep[];
}

export interface Candidate {
  id: string;
  fullName: string;
  currentInterviewStep: string;
  averageScore: number;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010';

/**
 * Obtiene el flujo de entrevistas para una posición específica
 * @param positionId - ID de la posición
 * @returns Datos del flujo de entrevistas
 */
export const getInterviewFlow = async (positionId: string): Promise<PositionInterviewFlow> => {
  try {
    const response = await axios.get(`${API_URL}/positions/${positionId}/interviewFlow`);
    
    // Validar que la respuesta tiene la estructura esperada
    if (!response.data.positionName || !Array.isArray(response.data.interviewSteps)) {
      throw new Error('Formato de respuesta inválido del servidor');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al obtener el flujo de entrevistas:', error);
    throw new Error('No se pudo obtener el flujo de entrevistas');
  }
};

/**
 * Obtiene los candidatos para una posición específica
 * @param positionId - ID de la posición
 * @returns Lista de candidatos
 */
export const getCandidates = async (positionId: string): Promise<Candidate[]> => {
  try {
    const response = await axios.get(`${API_URL}/positions/${positionId}/candidates`);
    
    // Validar que la respuesta tiene la estructura esperada
    if (!Array.isArray(response.data)) {
      throw new Error('Formato de respuesta inválido del servidor');
    }
    
    // Verificar que cada candidato tiene la estructura correcta
    const candidates = response.data.map((candidate: any) => {
      // Verificar campos requeridos
      if (!candidate.id || !candidate.fullName || !candidate.currentInterviewStep) {
        console.warn('Candidato con datos incompletos:', candidate);
      }
      
      // Asegurar que averageScore sea un número válido
      const averageScore = typeof candidate.averageScore === 'number' 
        ? candidate.averageScore 
        : parseFloat(candidate.averageScore) || 0;
      
      return {
        id: candidate.id,
        fullName: candidate.fullName || 'Sin nombre',
        currentInterviewStep: candidate.currentInterviewStep || 'Sin asignar',
        averageScore: averageScore
      };
    });
    
    return candidates;
  } catch (error) {
    console.error('Error al obtener candidatos:', error);
    throw new Error('No se pudo obtener la lista de candidatos');
  }
};

/**
 * Actualiza la fase de un candidato
 * @param candidateId - ID del candidato
 * @param applicationId - ID de la aplicación (puede ser igual al ID del candidato)
 * @param newStepId - ID de la nueva fase
 * @returns Respuesta del servidor o undefined en caso de error
 */
export const updateCandidateStage = async (candidateId: string, applicationId: string, newStepId: string): Promise<any> => {
  try {
    // Crear el objeto de datos según lo especificado en el prompt
    const payload = {
      applicationId: applicationId,
      currentInterviewStep: newStepId
    };
    
    // Realizar la llamada al endpoint PUT /candidates/:id/stage
    const response = await axios.put(`${API_URL}/candidates/${candidateId}/stage`, payload);
    
    // Validar la respuesta
    if (!response.data) {
      throw new Error('El servidor no devolvió datos');
    }
    
    // Devolver los datos de respuesta por si se necesitan
    return response.data;
  } catch (error) {
    console.error('Error al actualizar la fase del candidato:', error);
    throw new Error('No se pudo actualizar la fase del candidato');
  }
}; 